import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
const isGithub = process.env.BUILD_TARGET === "github";
export default defineConfig({
  plugins: [react()],
  base: isGithub ? "/major-project/" : "/", 
});
