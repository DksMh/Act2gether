package com.example.act2gether.service;

import org.springframework.stereotype.Service;
import java.util.*;
import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TourCacheService {
    private final Map<String, Object> cache = new ConcurrentHashMap<>();
    private final Map<String, LocalDateTime> cacheTime = new ConcurrentHashMap<>();
    private static final int CACHE_MINUTES = 30;
    
    public Optional<Object> get(String key) {
        LocalDateTime cached = cacheTime.get(key);
        if (cached != null && cached.plusMinutes(CACHE_MINUTES).isAfter(LocalDateTime.now())) {
            return Optional.ofNullable(cache.get(key));
        }
        cache.remove(key);
        cacheTime.remove(key);
        return Optional.empty();
    }
    
    public void put(String key, Object value) {
        cache.put(key, value);
        cacheTime.put(key, LocalDateTime.now());
    }
    
    public void clear() {
        cache.clear();
        cacheTime.clear();
    }
    
    public void remove(String key) {
        cache.remove(key);
        cacheTime.remove(key);
    }
}