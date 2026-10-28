package handler

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type UploadHandler struct {
	uploadDir       string
	publicBaseURL   string
}

func NewUploadHandler(uploadDir, publicBaseURL string) *UploadHandler {
	if uploadDir == "" {
		uploadDir = "./uploads"
	}
	_ = os.MkdirAll(uploadDir, 0755)
	return &UploadHandler{
		uploadDir:     uploadDir,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}
}

func (h *UploadHandler) UploadPhoto(w http.ResponseWriter, r *http.Request) {
	// Limit upload size to 5 MB for 3G/mobile photos
	r.Body = http.MaxBytesReader(w, r.Body, 5<<20)
	if err := r.ParseMultipartForm(5 << 20); err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "File too large (max 5MB) or invalid multipart form"})
		return
	}

	file, header, err := r.FormFile("photo")
	if err != nil {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "photo file field is required"})
		return
	}
	defer file.Close()

	// Read first 512 bytes to strictly verify image MIME magic bytes
	sniffBuf := make([]byte, 512)
	n, err := file.Read(sniffBuf)
	if err != nil && err != io.EOF {
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Failed to inspect file content"})
		return
	}
	contentType := http.DetectContentType(sniffBuf[:n])

	var ext string
	switch contentType {
	case "image/jpeg":
		ext = ".jpg"
	case "image/png":
		ext = ".png"
	case "image/webp":
		ext = ".webp"
	default:
		writeJSON(w, http.StatusBadRequest, map[string]string{
			"error": "Unsupported file type: only JPEG, PNG, and WebP photos are allowed",
		})
		return
	}

	if _, err := file.Seek(0, io.SeekStart); err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to process file stream"})
		return
	}

	randBytes := make([]byte, 6)
	_, _ = rand.Read(randBytes)
	filename := fmt.Sprintf("sb_evidence_%d_%s%s", time.Now().Unix(), hex.EncodeToString(randBytes), ext)
	destPath := filepath.Join(h.uploadDir, filename)

	out, err := os.Create(destPath)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to store uploaded photo"})
		return
	}
	defer out.Close()

	written, err := io.Copy(out, file)
	if err != nil {
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Failed to write uploaded photo"})
		return
	}

	photoURL := "/uploads/" + filename
	if h.publicBaseURL != "" {
		photoURL = h.publicBaseURL + "/uploads/" + filename
	}

	writeJSON(w, http.StatusCreated, map[string]interface{}{
		"url":           photoURL,
		"filename":      filename,
		"original_name": header.Filename,
		"content_type":  contentType,
		"size_bytes":    written,
	})
}

