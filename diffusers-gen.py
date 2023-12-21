from diffusers import DiffusionPipeline

if __name__ == "__main__":

    ldm = DiffusionPipeline.from_pretrained(
        "CompVis/ldm-text2im-large-256"
    )
    output = ldm(
        ["a painting of a raccoon reading a book"],
        num_inference_steps=50,
        eta=0.3,
        guidance_scale=6
    )
    output["sample"][0].save("image.png")