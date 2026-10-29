CREATE INDEX profiles_joined ON profiles (created_at);
CREATE INDEX profiles_best_at ON profiles (best_at);
CREATE INDEX entries_best_at ON entries (event_id, best_at);
