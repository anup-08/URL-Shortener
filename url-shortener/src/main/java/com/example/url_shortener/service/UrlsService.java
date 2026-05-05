package com.example.url_shortener.service;

import com.example.url_shortener.dtos.UrlDto;
import com.example.url_shortener.model.Url;
import com.example.url_shortener.repository.UrlsRepo;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@AllArgsConstructor
public class UrlsService {
    private final UrlsRepo urlsRepo;

    @Transactional
    public String createUrl(String longUrl) {
        Url url = Url.builder()
                .longUrl(longUrl)
                .build();
        Url saved  = urlsRepo.save(url);

        String shortUrl = Base62.encode(saved.getId());
        saved.setShortUrl(shortUrl);
        urlsRepo.save(saved);
        return shortUrl;
    }

    public String getOriginalUrl(String shortUrl) {
        Url url = urlsRepo.findByShortUrl(shortUrl).orElseThrow(() -> new RuntimeException("URL not found"));
        return url.getLongUrl();
    }

    public long getClickCount(String shortUrl) {
        Url url = urlsRepo.findByShortUrl(shortUrl).orElseThrow(() -> new RuntimeException("URL not found"));
        return url.getClickCount();
    }

    public void deleteUrl(String shortUrl) {
        int delete = urlsRepo.deleteByShortUrl(shortUrl);
        if (delete == 0) {
            throw new RuntimeException("URL not found");
        }
    }

    public UrlDto getStatus(String shortUrl) {
        Url url = urlsRepo.findByShortUrl(shortUrl).orElseThrow(() -> new RuntimeException("URL not found"));
        return mapToDto(url);
    }

    public String createCustomUrl(String longUrl, String customAlias) {
        if (urlsRepo.existsByShortUrl(customAlias)) {
            throw new RuntimeException("Custom alias already exists");
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
}
