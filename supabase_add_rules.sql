ALTER TABLE challenges ADD COLUMN rules JSONB DEFAULT '{
  "default": {"min_hr": 95, "min_duration": 45},
  "exceptions": {
    "Run": {"min_km": 4, "max_pace": 8.5},
    "Swim": {"min_km": 1},
    "Ride": {"min_km": 10},
    "VirtualRide": {"min_km": 10}
  }
}';
