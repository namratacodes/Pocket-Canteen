-- Run against the real database (read-only role is enough).

-- 1. Online accuracy of what the backend actually showed students, by source, last 7 days
SELECT eta_source, COUNT(*) AS n,
       ROUND(AVG(ABS(estimated_prep_seconds - actual_prep_seconds))) AS mae_s,
       ROUND(AVG(estimated_prep_seconds - actual_prep_seconds))      AS bias_s
FROM orders
WHERE actual_prep_seconds IS NOT NULL AND placed_at >= now() - interval '7 days'
GROUP BY eta_source;

-- 2. How often the backend fell back (ML down, slow, or circuit breaker open), per day
SELECT date_trunc('day', placed_at) AS day, ROUND(100.0 * AVG((eta_source = 'fallback')::int), 1) AS fallback_pct
FROM orders WHERE placed_at >= now() - interval '14 days' GROUP BY 1 ORDER BY 1;

-- 3. Error by hour of day (is the model worse at the lunch rush?)
SELECT EXTRACT(HOUR FROM placed_at AT TIME ZONE 'Asia/Kolkata')::int AS hour, COUNT(*) AS n,
       ROUND(AVG(ABS(estimated_prep_seconds - actual_prep_seconds))) AS mae_s
FROM orders WHERE eta_source = 'ml' AND actual_prep_seconds IS NOT NULL AND placed_at >= now() - interval '14 days'
GROUP BY 1 ORDER BY 1;
