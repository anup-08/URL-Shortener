package com.example.url_shortener.service;

import com.example.url_shortener.dtos.UrlDto;
import com.example.url_shortener.exception.UrlAlreadyExists;
import com.example.url_shortener.exception.UrlNotFound;
import com.example.url_shortener.model.Url;
import com.example.url_shortener.repository.UrlsRepo;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@AllArgsConstructor
public class UrlsService {
    private final UrlsRepo urlsRepo;

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
        return shortUrl;
    }

    @Transactional
    public String getOriginalUrl(String shortUrl) {

        Url url = getUrlOrThrow(shortUrl);

        url.setClickCount(url.getClickCount() + 1);
        urlsRepo.save(url);

        return url.getLongUrl();
    }

    public long getClickCount(String shortUrl) {
        Url url = getUrlOrThrow(shortUrl);
        return url.getClickCount();
    }

    public void deleteUrl(String shortUrl) {
        int delete = urlsRepo.deleteByShortUrl(shortUrl);
        if (delete == 0) {
            throw new UrlNotFound("URL not found");
        }
    }

    public UrlDto getStatus(String shortUrl) {
        Url url = getUrlOrThrow(shortUrl);
        return mapToDto(url);
    }

    public String createCustomUrl(String longUrl, String customAlias) {

        if (customAlias == null || customAlias.isBlank()) {
            throw new IllegalArgumentException("Alias cannot be empty");
        }

        if (longUrl == null || longUrl.isBlank()) {
            throw new IllegalArgumentException("Invalid URL");
        }

        if (urlsRepo.existsByShortUrl(customAlias)) {
            throw new UrlAlreadyExists("Custom alias already exists");
        }
        Url url = Url.builder()
                .longUrl(longUrl)
                .shortUrl(customAlias)
                .build();
        urlsRepo.save(url);
        return customAlias;
    }

    private UrlDto mapToDto(Url url){
        return UrlDto.builder()
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
}
