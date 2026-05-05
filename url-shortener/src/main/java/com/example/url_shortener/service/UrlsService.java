package com.example.url_shortener.service;

import com.example.url_shortener.dtos.UrlDto;
import com.example.url_shortener.exception.UrlAlreadyExists;
import com.example.url_shortener.exception.UrlNotFound;
import com.example.url_shortener.model.Url;
import com.example.url_shortener.repository.UrlsRepo;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.RedisCallback;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.*;

@Service
@AllArgsConstructor
public class UrlsService {
    private final UrlsRepo urlsRepo;
    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private final JdbcTemplate jdbcTemplate;

    @Transactional
    public String createUrl(String longUrl) {

        if (longUrl == null || longUrl.isBlank()) {
            throw new IllegalArgumentException("Invalid URL");
        }

        Optional<Url> existing = urlsRepo.findByLongUrl(longUrl.trim());
        if (existing.isPresent()) {
            return existing.get().getShortUrl();
        }

        Url url = Url.builder()
                .longUrl(longUrl.trim())
                .build();
        Url saved  = urlsRepo.save(url);

        String shortUrl = Base62.encode(saved.getId());
        saved.setShortUrl(shortUrl);
        urlsRepo.save(saved);
        redisTemplate.opsForValue().set("url:" + shortUrl , longUrl.trim() , Duration.ofHours(1));
        return shortUrl;
    }

    @Transactional
    public String getOriginalUrl(String shortUrl) {

        String cacheUrl = redisTemplate.opsForValue().get("url:" + shortUrl);

        if (cacheUrl != null) {
            redisTemplate.opsForValue().increment("click:" + shortUrl);
            return cacheUrl;
        }

        Url url = getUrlOrThrow(shortUrl);
        redisTemplate.opsForValue().set("url:" + shortUrl , url.getLongUrl() , Duration.ofHours(1));
        redisTemplate.opsForValue().increment("click:" + shortUrl);
        return url.getLongUrl();
    }

    public long getClickCount(String shortUrl) {
        Url url = getUrlOrThrow(shortUrl);
        return url.getClickCount();
    }

    public void deleteUrl(String shortUrl) {
        int delete = urlsRepo.deleteByShortUrl(shortUrl);
        redisTemplate.delete("url:" + shortUrl);
        redisTemplate.delete("status:" + shortUrl);
        redisTemplate.delete("click:" + shortUrl);
        if (delete == 0) {
            throw new UrlNotFound("URL not found");
        }
    }

    public UrlDto getStatus(String shortUrl) {
        String cache = redisTemplate.opsForValue().get("status:" + shortUrl);

        if (cache != null) return deserialize(cache);

        Url url = getUrlOrThrow(shortUrl);
        UrlDto dto = mapToDto(url);

        redisTemplate.opsForValue().set("status:" + shortUrl , serialize(dto) , Duration.ofMinutes(10));
        return dto;
    }

    private  String serialize(UrlDto dto) {
        try {
            return objectMapper.writeValueAsString(dto);
        } catch (Exception e) {
            throw new RuntimeException("Serialization error", e);
        }
    }

    private UrlDto deserialize(String cache) {
        try {
            return objectMapper.readValue(cache, UrlDto.class);
        } catch (Exception e) {
            throw new RuntimeException("Deserialization error", e);
        }
    }

    public String createCustomUrl(String longUrl, String customAlias) {

        if (customAlias == null || customAlias.isBlank()) {
            throw new IllegalArgumentException("Alias cannot be empty");
        }

        if (longUrl == null || longUrl.isBlank()) {
            throw new IllegalArgumentException("Invalid URL");
        }

        String alias = redisTemplate.opsForValue().get("url:" + customAlias.trim());
        if (alias != null) {
            throw new UrlAlreadyExists("Custom alias already exists");
        }

        if (urlsRepo.existsByShortUrl(customAlias.trim())) {
            throw new UrlAlreadyExists("Custom alias already exists");
        }

        Url url = Url.builder()
                .longUrl(longUrl)
                .shortUrl(customAlias.trim())
                .build();
        urlsRepo.save(url);
        redisTemplate.opsForValue().set("url:" + customAlias.trim() , longUrl.trim() , Duration.ofHours(1));
        return customAlias.trim();
    }

    private UrlDto mapToDto(Url url){
        return UrlDto.builder()
                .id(url.getId())
                .shortUrl(url.getShortUrl())
                .longUrl(url.getLongUrl())
                .createdAt(url.getCreatedAt())
                .clickCount(url.getClickCount())
                .build();
    }

    private Url getUrlOrThrow(String shortUrl) {
        return urlsRepo.findByShortUrl(shortUrl)
                .orElseThrow(() -> new UrlNotFound("URL not found"));
    }


    @Scheduled(fixedRate=60000)
    public void updateClickCounts(){
        System.out.println("Syncing click counts...");
        Set<String> keys = redisTemplate.keys("click:*");
        if (keys != null) {
            Map<String, Long> clickMap = new HashMap<>();
            for (String key : keys) {

                String shortUrl = key.substring(6);
                String countStr = redisTemplate.execute((RedisCallback<String>) connection ->
                        new String(connection.stringCommands().getDel(key.getBytes()))
                );
                if (countStr == null) continue;
                long count = Long.parseLong(countStr);
                clickMap.put(shortUrl, count);
            }
            batchUpdate(clickMap);
        }
        System.out.println("Synced...");

    }

    private void batchUpdate(Map<String, Long> clickMap) {
        String sql = "UPDATE urls SET click_count = click_count + ? WHERE short_url = ?";
        List<Object[]> batchArgs = new ArrayList<>();
        for (Map.Entry<String, Long> entry : clickMap.entrySet()) {
            batchArgs.add(new Object[]{entry.getValue(), entry.getKey()});
        }
        jdbcTemplate.batchUpdate(sql , batchArgs);
    }
}
