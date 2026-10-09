CREATE TABLE "chat_captive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"buscador_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_captive_buscador_id_unique" UNIQUE("buscador_id")
);
--> statement-breakpoint
CREATE TABLE "mensaje_captive" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chat_id" uuid NOT NULL,
	"autor_id" uuid NOT NULL,
	"de_captive" boolean NOT NULL,
	"texto" text NOT NULL,
	"leido_en" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_mensaje_captive_texto" CHECK (length(btrim("mensaje_captive"."texto")) between 1 and 2000)
);
--> statement-breakpoint
ALTER TABLE "chat_captive" ADD CONSTRAINT "chat_captive_buscador_id_usuario_id_fk" FOREIGN KEY ("buscador_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje_captive" ADD CONSTRAINT "mensaje_captive_chat_id_chat_captive_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."chat_captive"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "mensaje_captive" ADD CONSTRAINT "mensaje_captive_autor_id_usuario_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."usuario"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_mensaje_captive_chat" ON "mensaje_captive" USING btree ("chat_id","created_at");