package com.example.url_shortener.exception;

public class UrlNotFound extends RuntimeException {
    public UrlNotFound(String message) {
        super(message);
    }
}
