-- When each bill was sent to the CA. Null means not sent yet.
ALTER TABLE "Invoice" ADD COLUMN "sentToCaAt" TIMESTAMP(3);
