package com.example.url_shortener.controller;

import com.example.url_shortener.dtos.UrlDto;
import com.example.url_shortener.service.RateLimitService;
import com.example.url_shortener.service.UrlsService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;

@RestController
@RequestMapping("/api/url")
@AllArgsConstructor
public class UrlController {
    private final UrlsService urlsService;
    private final RateLimitService rateLimitService;

    @PostMapping("/shorten")
    public ResponseEntity<String> shortenUrl(@RequestBody String longUrl) {
        return ResponseEntity.status(HttpStatus.CREATED )
                .body(urlsService.createUrl(longUrl));
    }

    @PostMapping("/custom")
    public ResponseEntity<String> createCustomUrl(@RequestBody UrlDto request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(urlsService.createCustomUrl(request.getLongUrl(), request.getShortUrl()));
    }

    @GetMapping("/{shortUrl}")
    public ResponseEntity<Void> getOriginalUrl(@PathVariable String shortUrl , HttpServletRequest request) {

        String ip = request.getRemoteAddr();
        rateLimitService.validateRequest(ip + ":" + shortUrl);

        String originalUrl = urlsService.getOriginalUrl(shortUrl);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(originalUrl))
                .build();
    }

    @GetMapping("/{shortUrl}/open")
    public ResponseEntity<Void> openShortUrl(@PathVariable String shortUrl , HttpServletRequest request) {

        String ip = request.getRemoteAddr();
        rateLimitService.validateRequest(ip + ":" + shortUrl);

        String originalUrl = urlsService.getOriginalUrl(shortUrl);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(originalUrl))
                .build();
    }

    @GetMapping("/{shortUrl}/clicks")
    public ResponseEntity<Long> getClickCount(@PathVariable String shortUrl) {
        return ResponseEntity.ok(urlsService.getClickCount(shortUrl));
    }

    @GetMapping("/{shortUrl}/status")
    public ResponseEntity<UrlDto> getStatus(@PathVariable String shortUrl) {
        return ResponseEntity.ok(urlsService.getStatus(shortUrl));
    }

    @DeleteMapping("/{shortUrl}")
    public ResponseEntity<Void>  deleteUrl(@PathVariable String shortUrl) {
        urlsService.deleteUrl(shortUrl);
        return ResponseEntity.noContent().build();
    }

}
