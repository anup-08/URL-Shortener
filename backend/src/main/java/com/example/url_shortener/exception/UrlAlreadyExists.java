package com.example.url_shortener.exception;

public class UrlAlreadyExists extends RuntimeException {
    public UrlAlreadyExists(String message) {
        super(message);
    }
}
