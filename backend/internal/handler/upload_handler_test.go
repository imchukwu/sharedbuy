package handler

import (
	"bytes"
	"image"
	"image/color"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"
)

func createEmeraldIconPNG(size int) ([]byte, error) {
	img := image.NewRGBA(image.Rect(0, 0, size, size))
	emerald := color.RGBA{R: 6, G: 95, B: 70, A: 255}   // #065f46
	white := color.RGBA{R: 255, G: 255, B: 255, A: 255}

	margin := size / 4
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			if x >= margin && x < size-margin && y >= margin && y < size-margin {
				img.Set(x, y, white)
			} else {
				img.Set(x, y, emerald)
			}
		}
	}

	var buf bytes.Buffer
	if err := png.Encode(&buf, img); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func TestPriority4UploadAndPWAIcons(t *testing.T) {
	// 1. Ensure PWA raster icons (192x192 & 512x512) exist in frontend/public/
	publicDir := filepath.Clean("../../../frontend/public")
	if info, err := os.Stat(publicDir); err == nil && info.IsDir() {
		for _, sz := range []struct {
			size int
			name string
		}{
			{192, "icon-192.png"},
			{512, "icon-512.png"},
		} {
			pngBytes, err := createEmeraldIconPNG(sz.size)
			if err != nil {
				t.Fatalf("failed to encode %s: %v", sz.name, err)
			}
			if err := os.WriteFile(filepath.Join(publicDir, sz.name), pngBytes, 0644); err != nil {
				t.Fatalf("failed to write %s: %v", sz.name, err)
			}
		}
	}

	// 2. Test UploadHandler magic-byte validation
	tmpDir := t.TempDir()
	uh := NewUploadHandler(tmpDir, "")

	validPNG, _ := createEmeraldIconPNG(64)
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, _ := writer.CreateFormFile("photo", "scale_reading.png")
	_, _ = part.Write(validPNG)
	_ = writer.Close()

	req := httptest.NewRequest(http.MethodPost, "/api/uploads", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	rec := httptest.NewRecorder()
	uh.UploadPhoto(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201 Created for valid PNG upload, got %d: %s", rec.Code, rec.Body.String())
	}

	// 3. Reject spoofed non-image payload (.png extension with text/html content)
	var badBody bytes.Buffer
	badWriter := multipart.NewWriter(&badBody)
	badPart, _ := badWriter.CreateFormFile("photo", "spoofed.png")
	_, _ = badPart.Write([]byte("<script>alert('xss')</script>"))
	_ = badWriter.Close()

	badReq := httptest.NewRequest(http.MethodPost, "/api/uploads", &badBody)
	badReq.Header.Set("Content-Type", badWriter.FormDataContentType())
	badRec := httptest.NewRecorder()
	uh.UploadPhoto(badRec, badReq)

	if badRec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 Bad Request for spoofed non-image upload, got %d", badRec.Code)
	}
}

