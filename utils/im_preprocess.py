from PIL import Image
import numpy as np

def preprocess(ipf="static/rect-satellite.png", opf="static/rect-satellite-texture.png"):
    imarr = np.array(Image.open(ipf))

    def color_limit(color, lim=400):
        cs = np.sum(color)
        if cs > lim:
            return np.array(color/cs*lim)
        return color
    imarr = np.array(np.apply_along_axis(color_limit, 2, imarr), dtype=np.uint8)
    Image.fromarray(imarr).save(opf)

if __name__ == "__main__":
    preprocess()
