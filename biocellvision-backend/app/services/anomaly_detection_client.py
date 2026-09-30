import httpx


class AnomalyDetectionClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    async def predict_by_file(self, image_path: str, cell_class: str):
        url = f"{self.base_url}/predict-file"

        with open(image_path, "rb") as f:
            files = {
                "file": (image_path, f, "image/png")
            }
            data = {
                "cell_class": cell_class
            }

            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(
                    url,
                    files=files,
                    data=data,
                )

        response.raise_for_status()
        return response.json()

    async def predict_by_path(self, image_path: str, cell_class: str):
        url = f"{self.base_url}/predict-path"

        payload = {
            "image_path": image_path,
            "cell_class": cell_class,
        }

        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(url, json=payload)

        response.raise_for_status()
        return response.json()