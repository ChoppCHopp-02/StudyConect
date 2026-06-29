-- Migration to enable REPLICA IDENTITY FULL for tables with delete filters on realtime subscriptions
ALTER TABLE deadlines REPLICA IDENTITY FULL;
ALTER TABLE schedules REPLICA IDENTITY FULL;
ALTER TABLE messages REPLICA IDENTITY FULL;
ALTER TABLE group_members REPLICA IDENTITY FULL;
