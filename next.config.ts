import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Servidor autocontenido para la imagen de Docker (Dockerfile): solo lo necesario para correr.
  output: "standalone",
};

export default nextConfig;
