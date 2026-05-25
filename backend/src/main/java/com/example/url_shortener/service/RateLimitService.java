package com.example.url_shortener.service;

import com.example.url_shortener.config.RateLimitingConfiguration;
import lombok.AllArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@AllArgsConstructor
public class RateLimitService {
    private final RateLimitingConfiguration rateLimitingConfiguration;
    private final StringRedisTemplate redisTemplate;

    public void validateRequest(String key){
        String redisKey = "rate:" + key;
        Long count = redisTemplate.opsForValue().increment(redisKey);

        if (count != null && count == 1) {
            redisTemplate.expire(redisKey, Duration.ofSeconds(rateLimitingConfiguration.getDuration()));
        }

        if (count != null && count > rateLimitingConfiguration.getRequests()) {
            throw new RuntimeException("Too many requests. Try again later.");
        }

    }
}
