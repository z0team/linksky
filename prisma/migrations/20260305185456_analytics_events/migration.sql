-- CreateTable
CREATE TABLE "public"."profile_view_events" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "referrer_host" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profile_view_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."social_click_events" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "referrer_host" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_click_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "profile_view_events_username_created_at_idx" ON "public"."profile_view_events"("username", "created_at");

-- CreateIndex
CREATE INDEX "profile_view_events_referrer_host_idx" ON "public"."profile_view_events"("referrer_host");

-- CreateIndex
CREATE INDEX "social_click_events_username_created_at_idx" ON "public"."social_click_events"("username", "created_at");

-- CreateIndex
CREATE INDEX "social_click_events_platform_idx" ON "public"."social_click_events"("platform");

-- AddForeignKey
ALTER TABLE "public"."profile_view_events" ADD CONSTRAINT "profile_view_events_username_fkey" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."social_click_events" ADD CONSTRAINT "social_click_events_username_fkey" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE CASCADE ON UPDATE CASCADE;
