package com.example.url_shortener.repository;

import com.example.url_shortener.model.Url;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UrlsRepo extends JpaRepository<Url,Long> {

    Optional<Url> findByShortUrl(String shortUrl);
    int deleteByShortUrl(String shortUrl);
}
