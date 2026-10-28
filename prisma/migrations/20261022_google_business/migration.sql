-- The Google account connected in Admin -> Google Business. One row; tokens are stored encrypted.
CREATE TABLE "GoogleBusinessConnection" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "email" TEXT,
    "refreshToken" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "accountName" TEXT,
    "locationName" TEXT,
    "locationTitle" TEXT,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GoogleBusinessConnection_pkey" PRIMARY KEY ("id")
);
