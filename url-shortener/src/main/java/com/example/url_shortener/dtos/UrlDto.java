package com.example.url_shortener.dtos;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UrlDto {
    private long id;
    private String shortUrl;
    private String longUrl;
    private LocalDateTime createdAt;
    private long clickCount;
}
