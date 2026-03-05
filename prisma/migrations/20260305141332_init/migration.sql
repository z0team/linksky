-- CreateTable
CREATE TABLE "public"."users" (
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "public"."profiles" (
    "username" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "bio" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "avatar_url" TEXT NOT NULL,
    "background_url" TEXT NOT NULL,
    "music_url" TEXT NOT NULL,
    "cursor_url" TEXT NOT NULL,
    "song_title" TEXT NOT NULL,
    "enter_text" TEXT NOT NULL,
    "accent_color" TEXT NOT NULL,
    "card_opacity" DOUBLE PRECISION NOT NULL,
    "blur_strength" DOUBLE PRECISION NOT NULL,
    "show_views" BOOLEAN NOT NULL,
    "enable_glow" BOOLEAN NOT NULL,
    "font_family" TEXT NOT NULL,
    "socials_json" JSONB NOT NULL,
    "views" INTEGER NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("username")
);

-- CreateTable
CREATE TABLE "public"."sessions" (
    "session_id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "public"."media" (
    "id" TEXT NOT NULL,
    "owner_username" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "media_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "public"."users"("email");

-- CreateIndex
CREATE INDEX "sessions_username_idx" ON "public"."sessions"("username");

-- CreateIndex
CREATE INDEX "media_owner_username_idx" ON "public"."media"("owner_username");

-- AddForeignKey
ALTER TABLE "public"."profiles" ADD CONSTRAINT "profiles_username_fkey" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."sessions" ADD CONSTRAINT "sessions_username_fkey" FOREIGN KEY ("username") REFERENCES "public"."users"("username") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."media" ADD CONSTRAINT "media_owner_username_fkey" FOREIGN KEY ("owner_username") REFERENCES "public"."users"("username") ON DELETE CASCADE ON UPDATE CASCADE;
