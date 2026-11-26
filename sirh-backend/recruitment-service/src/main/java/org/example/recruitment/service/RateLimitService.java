package org.example.recruitment.service;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

@Service
public class RateLimitService {

    private final ConcurrentHashMap<String, UserRateLimit> userLimits = new ConcurrentHashMap<>();

    private static final int MAX_REQUESTS_PER_HOUR = 10;
    private static final int HOUR_IN_MILLIS = 60 * 60 * 1000;

    public boolean tryAcquire(String userId) {
        UserRateLimit limit = userLimits.computeIfAbsent(userId, k -> new UserRateLimit());

        synchronized (limit) {
            LocalDateTime now = LocalDateTime.now();
            long nowMillis = System.currentTimeMillis();

            // Reset counter if hour has passed
            if (nowMillis - limit.windowStartMillis >= HOUR_IN_MILLIS) {
                limit.requests.set(0);
                limit.windowStartMillis = nowMillis;
            }

            // Check if under limit
            if (limit.requests.get() < MAX_REQUESTS_PER_HOUR) {
                limit.requests.incrementAndGet();
                return true;
            }

            return false;
        }
    }

    public int getRemainingRequests(String userId) {
        UserRateLimit limit = userLimits.get(userId);
        if (limit == null) return MAX_REQUESTS_PER_HOUR;

        synchronized (limit) {
            long nowMillis = System.currentTimeMillis();
            if (nowMillis - limit.windowStartMillis >= HOUR_IN_MILLIS) {
                return MAX_REQUESTS_PER_HOUR;
            }
            return Math.max(0, MAX_REQUESTS_PER_HOUR - limit.requests.get());
        }
    }

    private static class UserRateLimit {
        final AtomicInteger requests = new AtomicInteger(0);
        volatile long windowStartMillis = System.currentTimeMillis();
    }
}