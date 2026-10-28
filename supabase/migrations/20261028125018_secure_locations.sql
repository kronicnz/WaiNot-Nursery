REVOKE ALL ON TABLE "public"."locations" FROM "anon";
REVOKE TRUNCATE, REFERENCES, TRIGGER ON TABLE "public"."locations" FROM "authenticated";

ALTER TABLE "public"."locations"
  ENABLE ROW LEVEL SECURITY;
