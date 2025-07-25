package helpers

import (
	"back-end/config"
	"bytes"
	"errors"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"io"
	"io/ioutil"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/chai2010/webp"
	"github.com/google/uuid"
	"github.com/nfnt/resize"
)

// sanitizeFileName reemplaza espacios y asegura que el nombre del archivo no se repita.
func sanitizeFileName(basePath, originalName string) string {
	// Reemplaza espacios por guiones bajos
	name := strings.ReplaceAll(originalName, " ", "_")
	ext := filepath.Ext(name)
	base := strings.TrimSuffix(name, ext)
	// Genera un UUID y lo incorpora al nombre
	finalName := fmt.Sprintf("%s_%s%s", base, uuid.New().String(), ext)

	// Opcionalmente, si querés asegurarte de que no exista (aunque la probabilidad es mínima)
	for {
		if _, err := os.Stat(filepath.Join(basePath, finalName)); os.IsNotExist(err) {
			break
		}
		finalName = fmt.Sprintf("%s_%s%s", base, uuid.New().String(), ext)
	}
	return finalName
}
func ProcessImage(fileHeader *multipart.FileHeader, PostImageChanel chan string, errChanel chan error, dir string) {
	if fileHeader == nil {
		PostImageChanel <- ""
		return
	}

	// Abrir el archivo cargado
	file, err := fileHeader.Open()
	if err != nil {
		errChanel <- fmt.Errorf("error opening file: %v", err)
		return
	}
	defer file.Close()

	// Leer los datos del archivo en memoria
	inputBuf, err := ioutil.ReadAll(file)
	if err != nil {
		errChanel <- fmt.Errorf("error reading file: %v", err)
		return
	}

	// Detectar el tipo de contenido para seleccionar el decodificador correcto
	contentType := http.DetectContentType(inputBuf)

	// Decodificar la imagen según el tipo detectado
	var img image.Image
	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding JPEG image: %v", err)
			return
		}
	case "image/png":
		img, err = png.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding PNG image: %v", err)
			return
		}
	case "image/webp":
		img, err = webp.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding WebP image: %v", err)
			return
		}
	default:
		errChanel <- fmt.Errorf("unsupported image format: %s", contentType)
		return
	}

	// Ruta base de almacenamiento local
	basePath := filepath.Join(config.BasePathUpload(), "images", dir)
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		errChanel <- fmt.Errorf("error creating directories: %v", err)
		return
	}

	// Generar el nombre del archivo con extensión .webp
	fileName := sanitizeFileName(basePath, fileHeader.Filename)
	outputFileName := strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".webp"
	outputPath := filepath.Join(basePath, outputFileName)

	// Comprimir y ajustar la calidad para alcanzar el tamaño objetivo (~120 KB)
	var quality int = 75
	var outputImg []byte
	for {
		buffer := new(bytes.Buffer)
		if err := webp.Encode(buffer, img, &webp.Options{Quality: float32(quality)}); err != nil {
			errChanel <- fmt.Errorf("error encoding image to WebP: %v", err)
			return
		}
		outputImg = buffer.Bytes()

		// Si el tamaño es menor o igual a 120 KB o la calidad ya es mínima, termina
		if len(outputImg) <= 120*1024 || quality <= 10 {
			break
		}

		// Reducir la calidad en 5 puntos e intentar nuevamente
		quality -= 5
	}

	// Guardar la imagen WebP en el disco
	if err := ioutil.WriteFile(outputPath, outputImg, 0644); err != nil {
		errChanel <- fmt.Errorf("error writing file: %v", err)
		return
	}

	// Enviar la URL generada al canal
	PostImageChanel <- fmt.Sprintf("%s/images/%s/%s", config.MediaBaseURL(), dir, outputFileName)
}
func ProcessImageEmotes(fileHeader *multipart.FileHeader, PostImageChanel chan string, errChanel chan error, nameUser, typeEmote string) {
	if fileHeader == nil {
		PostImageChanel <- ""
		return
	}

	// Abrir el archivo cargado
	file, err := fileHeader.Open()
	if err != nil {
		errChanel <- fmt.Errorf("error opening file: %v", err)
		return
	}
	defer file.Close()

	// Leer los datos del archivo en memoria
	inputBuf, err := ioutil.ReadAll(file)
	if err != nil {
		errChanel <- fmt.Errorf("error reading file: %v", err)
		return
	}

	// Verificar el tamaño del archivo
	fileSize := fileHeader.Size
	if fileSize > 1<<20 { // 1 MB
		errChanel <- errors.New("el tamaño de la imagen excede 1MB")
		return
	}

	// Detectar el tipo de contenido para seleccionar el decodificador correcto
	contentType := http.DetectContentType(inputBuf)

	// Decodificar la imagen según el tipo detectado
	var img image.Image
	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding JPEG image: %v", err)
			return
		}
	case "image/png":
		img, err = png.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding PNG image: %v", err)
			return
		}
	case "image/webp":
		img, err = webp.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding WebP image: %v", err)
			return
		}
	default:
		errChanel <- fmt.Errorf("unsupported image format: %s", contentType)
		return
	}

	// Redimensionar la imagen (ajusta las dimensiones según tus necesidades)
	img = resize.Resize(128, 128, img, resize.Lanczos3) // Aquí puedes cambiar las dimensiones

	// Definir la ruta de almacenamiento local
	basePath := filepath.Join(config.BasePathUpload(), "emotes", typeEmote)
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		errChanel <- fmt.Errorf("error creating directories: %v", err)
		return
	}

	// Sanitizar el nombre del archivo
	fileName := sanitizeFileName(basePath, fileHeader.Filename)
	outputFileName := strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".webp" // Cambio a WebP
	outputPath := filepath.Join(basePath, outputFileName)

	// Comprimir y ajustar la calidad para alcanzar el tamaño objetivo (~120 KB)
	var quality int = 75
	var outputImg []byte
	for {
		buffer := new(bytes.Buffer)
		if err := webp.Encode(buffer, img, &webp.Options{Quality: float32(quality)}); err != nil {
			errChanel <- fmt.Errorf("error encoding image to WebP: %v", err)
			return
		}
		outputImg = buffer.Bytes()

		// Si el tamaño es menor o igual a 120 KB o la calidad ya es mínima, termina
		if len(outputImg) <= 33*1024 || quality <= 10 {
			break
		}

		// Reducir la calidad en 5 puntos e intentar nuevamente
		quality -= 5
	}

	// Guardar la imagen WebP en el disco
	if err := ioutil.WriteFile(outputPath, outputImg, 0644); err != nil {
		errChanel <- fmt.Errorf("error writing file: %v", err)
		return
	}

	// Enviar la URL generada al canal
	PostImageChanel <- fmt.Sprintf("%s/emotes/%s/%s", config.MediaBaseURL(), typeEmote, outputFileName)
}

func ProcessImageThumbnail(fileHeader *multipart.FileHeader, PostImageChanel chan string, errChanel chan error) {
	if fileHeader == nil {
		PostImageChanel <- ""
		return
	}

	// Abrir el archivo cargado
	file, err := fileHeader.Open()
	if err != nil {
		errChanel <- fmt.Errorf("error opening file: %v", err)
		return
	}
	defer file.Close()

	// Leer los datos del archivo en memoria
	inputBuf, err := ioutil.ReadAll(file)
	if err != nil {
		errChanel <- fmt.Errorf("error reading file: %v", err)
		return
	}

	// Detectar el tipo de contenido para seleccionar el decodificador correcto
	contentType := http.DetectContentType(inputBuf)

	// Decodificar la imagen según el tipo detectado
	var img image.Image
	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding JPEG image: %v", err)
			return
		}
	case "image/png":
		img, err = png.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding PNG image: %v", err)
			return
		}
	case "image/webp":
		img, err = webp.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding WebP image: %v", err)
			return
		}
	default:
		errChanel <- fmt.Errorf("unsupported image format: %s", contentType)
		return
	}

	// Redimensionar la imagen (puedes ajustar las dimensiones según tus necesidades)
	img = resize.Resize(260, 150, img, resize.Lanczos3)

	// Ruta base de almacenamiento local
	basePath := filepath.Join(config.BasePathUpload(), "images", "Thumbnail")
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		errChanel <- fmt.Errorf("error creating directories: %v", err)
		return
	}

	// Generar el nombre del archivo con extensión .webp
	fileName := sanitizeFileName(basePath, fileHeader.Filename)
	outputFileName := strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".webp"
	outputPath := filepath.Join(basePath, outputFileName)

	// Comprimir y ajustar la calidad para alcanzar el tamaño objetivo (~120 KB)
	var quality int = 75
	var outputImg []byte
	for {
		buffer := new(bytes.Buffer)
		if err := webp.Encode(buffer, img, &webp.Options{Quality: float32(quality)}); err != nil {
			errChanel <- fmt.Errorf("error encoding image to WebP: %v", err)
			return
		}
		outputImg = buffer.Bytes()

		// Si el tamaño es menor o igual a 120 KB o la calidad ya es mínima, termina
		if len(outputImg) <= 120*1024 || quality <= 10 {
			break
		}

		// Reducir la calidad en 5 puntos e intentar nuevamente
		quality -= 5
	}

	// Guardar la imagen WebP en el disco
	if err := ioutil.WriteFile(outputPath, outputImg, 0644); err != nil {
		errChanel <- fmt.Errorf("error writing file: %v", err)
		return
	}

	// Enviar la URL generada al canal
	PostImageChanel <- fmt.Sprintf("%s/images/Thumbnail/%s", config.MediaBaseURL(), outputFileName)
}

// UpdateClipPreviouImage guarda un archivo existente en una nueva ubicación
func UpdateClipPreviouImage(filePath string) (string, error) {
	basePath := filepath.Join(config.BasePathUpload(), "clips")
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		return "", err
	}

	fileName := sanitizeFileName(basePath, filepath.Base(filePath))
	newPath := filepath.Join(basePath, fileName)

	input, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer input.Close()

	output, err := os.Create(newPath)
	if err != nil {
		return "", err
	}
	defer output.Close()

	if _, err := input.Seek(0, 0); err != nil {
		return "", err
	}

	if _, err := output.ReadFrom(input); err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/clips/%s", config.MediaBaseURL(), fileName), nil
}

// UploadVideo guarda videos en el servidor local
func UploadVideo(filePath string) (string, error) {
	// Ruta base para almacenar videos
	basePath := filepath.Join(config.BasePathUpload(), "videos")
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		return "", err
	}

	uniqueID := uuid.New().String()
	ext := filepath.Ext(filePath)

	fileName := fmt.Sprintf("%s%s", uniqueID, ext)
	newPath := filepath.Join(basePath, fileName)

	input, err := os.Open(filePath)
	if err != nil {
		return "", err
	}
	defer input.Close()

	output, err := os.Create(newPath)
	if err != nil {
		return "", err
	}
	defer output.Close()

	if _, err := input.Seek(0, 0); err != nil {
		return "", err
	}
	if _, err := output.ReadFrom(input); err != nil {
		return "", err
	}

	return fmt.Sprintf("%s/videos/%s", config.MediaBaseURL(), fileName), nil
}

func ProcessImageCategorias(fileHeader *multipart.FileHeader, PostImageChanel chan string, errChanel chan error) {
	if fileHeader == nil {
		PostImageChanel <- ""
		return
	}

	// Abrir el archivo cargado
	file, err := fileHeader.Open()
	if err != nil {
		errChanel <- fmt.Errorf("error opening file: %v", err)
		return
	}
	defer file.Close()

	// Leer los datos del archivo en memoria
	inputBuf, err := ioutil.ReadAll(file)
	if err != nil {
		errChanel <- fmt.Errorf("error reading file: %v", err)
		return
	}

	// Detectar el tipo de contenido para seleccionar el decodificador correcto
	contentType := http.DetectContentType(inputBuf)

	// Decodificar la imagen según el tipo detectado
	var img image.Image
	switch contentType {
	case "image/jpeg":
		img, err = jpeg.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding JPEG image: %v", err)
			return
		}
	case "image/png":
		img, err = png.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding PNG image: %v", err)
			return
		}
	case "image/webp":
		img, err = webp.Decode(bytes.NewReader(inputBuf))
		if err != nil {
			errChanel <- fmt.Errorf("error decoding WebP image: %v", err)
			return
		}
	default:
		errChanel <- fmt.Errorf("unsupported image format: %s", contentType)
		return
	}

	// Redimensionar la imagen a 172x216
	img = resize.Resize(172, 216, img, resize.Lanczos3)

	// Ruta base de almacenamiento local
	basePath := filepath.Join(config.BasePathUpload(), "images", "categories")
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		errChanel <- fmt.Errorf("error creating directories: %v", err)
		return
	}

	// Generar el nombre del archivo con extensión .webp
	fileName := sanitizeFileName(basePath, fileHeader.Filename)
	outputFileName := strings.TrimSuffix(fileName, filepath.Ext(fileName)) + ".webp"
	outputPath := filepath.Join(basePath, outputFileName)

	// Comprimir y ajustar la calidad para alcanzar el tamaño objetivo (~120 KB)
	var quality int = 75
	var outputImg []byte
	for {
		buffer := new(bytes.Buffer)
		if err := webp.Encode(buffer, img, &webp.Options{Quality: float32(quality)}); err != nil {
			errChanel <- fmt.Errorf("error encoding image to WebP: %v", err)
			return
		}
		outputImg = buffer.Bytes()

		// Si el tamaño es menor o igual a 120 KB o la calidad ya es mínima, termina
		if len(outputImg) <= 120*1024 || quality <= 10 {
			break
		}

		// Reducir la calidad en 5 puntos e intentar nuevamente
		quality -= 5
	}

	// Guardar la imagen WebP en el disco
	if err := ioutil.WriteFile(outputPath, outputImg, 0644); err != nil {
		errChanel <- fmt.Errorf("error writing file: %v", err)
		return
	}

	// Enviar la URL generada al canal
	PostImageChanel <- fmt.Sprintf("%s/images/categories/%s", config.MediaBaseURL(), outputFileName)
}
func CopyImageFromURL(imageURL string) (string, error) {
	// Descargar la imagen desde la URL
	resp, err := http.Get(imageURL)
	if err != nil {
		return "", fmt.Errorf("error al descargar la imagen: %v", err)
	}
	defer resp.Body.Close()

	// Verificar que el estado HTTP sea 200 OK
	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("error: estado HTTP %d", resp.StatusCode)
	}

	// Crear la ruta de destino
	basePath := filepath.Join(config.BasePathUpload(), "imagesClips")
	if err := os.MkdirAll(basePath, os.ModePerm); err != nil {
		return "", fmt.Errorf("error al crear el directorio de destino: %v", err)
	}

	// Generar un nombre único para la imagen usando UUID
	uniqueID := uuid.New().String()
	ext := filepath.Ext(imageURL) // Obtener la extensión del archivo original
	if ext == "" {
		ext = ".jpg" // Si no tiene extensión, asignar ".jpg" por defecto
	}
	fileName := fmt.Sprintf("%s%s", uniqueID, ext)

	// Crear el archivo en la ruta de destino
	filePath := filepath.Join(basePath, fileName)
	out, err := os.Create(filePath)
	if err != nil {
		return "", fmt.Errorf("error al crear el archivo: %v", err)
	}
	defer out.Close()

	// Copiar el contenido de la imagen al archivo
	if _, err := io.Copy(out, resp.Body); err != nil {
		return "", fmt.Errorf("error al guardar la imagen: %v", err)
	}

	// Devolver la URL local de la imagen
	return fmt.Sprintf("%s/imagesClips/%s", config.MediaBaseURL(), fileName), nil
}
