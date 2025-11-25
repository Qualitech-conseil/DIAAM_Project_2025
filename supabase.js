import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
    "https://vawvmiosgslvykfqxffs.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhd3ZtaW9zZ3NsdnlrZnF4ZmZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM5NjcxNTAsImV4cCI6MjA3OTU0MzE1MH0.T_q5fT1PCOt_pwEFdoKqePFYp7N4IXZSN1XA3HGG5v8"
);


