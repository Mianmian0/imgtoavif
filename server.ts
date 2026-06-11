import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  app.post("/api/convert", upload.single("image"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      const buffer = req.file.buffer;
      const targetFormat = req.body.targetFormat || "image/avif";
      const quality = parseFloat(req.body.quality) || 0.8;

      const sharpQuality = Math.max(1, Math.min(100, Math.round(quality * 100)));

      let pipeline = sharp(buffer);

      let outBuffer;
      if (targetFormat === "image/avif") {
        outBuffer = await pipeline.avif({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/webp") {
        outBuffer = await pipeline.webp({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/jpeg") {
        outBuffer = await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/png") {
        outBuffer = await pipeline.png().toBuffer();
      } else {
        return res.status(400).json({ error: "Unsupported target format" });
      }

      res.setHeader("Content-Type", targetFormat);
      res.send(outBuffer);
    } catch (err: any) {
      console.error("Conversion error:", err);
      res.status(500).json({ error: err.message || "Failed to convert image" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    // Dynamically import vite so it doesn't crash production without devDependencies
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
