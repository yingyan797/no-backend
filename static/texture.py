import numpy as np
from PIL import Image
from matplotlib import pyplot as plt
from icosphere import icosphere

def create_icosphere(src="static/rect-satellite-texture.png", subdivisions=24):
    vertices, indices = icosphere(subdivisions)
    imarr = np.array(Image.open(src))[::-1, :]/255
    texture = np.apply_along_axis(
        lambda v: _vert_imgcoord(v, imarr.shape[1], imarr.shape[0]), 1, vertices)
    _draw_texture(texture)
    colors = np.array([imarr[vert[0]][vert[1]] for vert in texture], dtype=float)
    return vertices, indices, colors   

def _vert_imgcoord(vert, w, h):
    lon = np.arctan2(vert[1], vert[0])
    lat = np.arcsin(vert[2])
    rat = np.multiply(np.array([lat, lon])/np.pi + np.array([0.5, 1]), np.array([h-1, 0.5*(w-1)]))
    return np.array(rat, dtype=np.uint16)

def _draw_texture(texture):
    plt.title("Texture map")
    plt.scatter(texture[:, 1], texture[:, 0], marker=".")
    plt.show()

if __name__ == "__main__":
    vert, indx, colors = create_icosphere(src="static/moon-rect.jpg")
    title = "moon"
    with open(f"static/{title}_model.js", "w") as f:
        f.write("")
    with open(f"static/{title}_model.js", "a") as f:
        f.write(f"const {title}_vertices = [")
        for row in vert:
            for c in row:
                f.write(f"{c},")
        f.write(f"];\n\nconst {title}_indices = [")
        for row in indx:
            for c in row:
                f.write(f"{c},")
        f.write(f"];\n\nconst {title}_colors = [")
        for row in colors:
            for c in row:
                f.write(f"{c},")
            f.write("1.0,")
        f.write("];")
    
