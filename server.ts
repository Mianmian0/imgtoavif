import express from "express";
import path from "path";
import multer from "multer";
import sharp from "sharp";
import cors from "cors";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Setup multer with memory storage for file uploads
  // We limit the size of uploaded files to something reasonable, maybe 50MB
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // API routines
  app.post("/api/convert", upload.single("image"), async (req: any, res: any) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No image provided" });
      }

      const buffer = req.file.buffer;
      const targetFormat = req.body.targetFormat || "image/avif";
      const quality = parseFloat(req.body.quality) || 0.8;
      const scale = parseInt(req.body.scale) || 1;

      // Ensure quality is between 1-100 for sharp
      const sharpQuality = Math.max(1, Math.min(100, Math.round(quality * 100)));

      let pipeline = sharp(buffer);

      // Handle scaling by querying metadata first
      if (scale !== 1) {
        const metadata = await pipeline.metadata();
        if (metadata.width && metadata.height) {
          pipeline = pipeline.resize({
            width: Math.round(metadata.width * scale),
            height: Math.round(metadata.height * scale),
            fit: 'fill'
          });
        }
      }

      // Convert
      let info;
      let outBuffer;
      if (targetFormat === "image/avif") {
        outBuffer = await pipeline.avif({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/webp") {
        outBuffer = await pipeline.webp({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/jpeg") {
        // Flatten to avoid transparency issues in JPEG
        outBuffer = await pipeline.flatten({ background: "#ffffff" }).jpeg({ quality: sharpQuality }).toBuffer();
      } else if (targetFormat === "image/png") {
        // Sharp PNG compression level usually is 1-9. We can just use default.
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

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = process.env.NODE_ENV === "production" ? __dirname : path.join(process.cwd(), "dist");
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
