from fastapi import FastAPI, File, UploadFile
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from rembg import remove
import io

app = FastAPI(title="KLOZEsticker BG Removal API")

# Add CORS to allow requests from the app
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "healthy", "service": "bg-removal"}

@app.post("/api/v1/remove-bg")
async def remove_background(image: UploadFile = File(...)):
    # Read the uploaded image
    input_image = await image.read()
    
    # Remove background
    output_image = remove(input_image)
    
    # Return as PNG
    return Response(content=output_image, media_type="image/png")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
