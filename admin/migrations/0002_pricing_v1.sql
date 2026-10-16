-- Version 1 of the price list: the site's own src/data/pricing.ts as it stood on 2026-10-16.
-- CONFIRM: every figure is the developer's estimate, not the client's (site notes, N5).
INSERT INTO pricing_versions (version, rates_json, note, published_at)
VALUES (1, '{"currency":"INR","locale":"en-IN","shell":{"A":420000,"B":245000},"footing":[7500,9500,12000],"combined":0.6,"plinth":[1600,2100,2700],"deck":4500,"post":1900,"spandrel":1400,"handrail":3200,"steps":16000,"shade":12500,"roof":{"A":48000,"B":27000},"solar":{"A":165000,"B":90000},"gallery":6000,"stair":120000,"delivery":38000}', 'The website''s own prices (src/data/pricing.ts)', '2026-10-16T00:00:00.000Z');
