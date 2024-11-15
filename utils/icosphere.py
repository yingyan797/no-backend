import numpy as np
from matplotlib import pyplot as plt

def create_icosphere(radius=1.0, subdivisions=0):
    """
    Generate an icosphere mesh with the given radius and number of subdivisions.
    
    Parameters:
    radius (float): Radius of the icosphere
    subdivisions (int): Number of subdivision iterations to perform
    
    Returns:
    vertices (numpy.ndarray): Vertex positions (Nx3)
    indices (numpy.ndarray): Triangle indices (Mx3)
    """
    # Initial icosahedron vertices
    t = (1.0 + np.sqrt(5.0)) / 2.0
    vertices = np.array([
        (-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0),
        (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t),
        (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)
    ])
    
    # Normalize vertices to lie on a unit sphere
    vertices *= radius / np.linalg.norm(vertices, axis=1)[:, None]
    
    # Initial icosahedron faces
    indices = np.array([
        (0, 11, 5), (0, 5, 1), (0, 1, 7), (0, 7, 10), (0, 10, 11),
        (1, 5, 9), (5, 11, 4), (11, 10, 2), (10, 7, 6), (7, 1, 8),
        (3, 9, 4), (3, 4, 2), (3, 2, 6), (3, 6, 8), (3, 8, 9),
        (4, 9, 5), (2, 4, 11), (6, 2, 10), (8, 6, 7), (9, 8, 1)
    ])
    # Subdivide the mesh
    for _ in range(subdivisions):
        mid_points = []
        new_indices = []
        for i in range(indices.shape[0]):
            a = indices[i][0]
            b = indices[i][1]
            c = indices[i][2]
            a1 = vertices.shape[0] + i*3
            b1 = a1 + 1
            c1 = b1 + 1
            mid_points.append(vertices[a] + vertices[b])
            mid_points.append(vertices[b] + vertices[c])
            mid_points.append(vertices[c] + vertices[a])
            new_indices.extend([(a, a1, c1), (a1, b, b1), (a1, b1, c1), (c1, c, a)])

        mid_points = np.array(mid_points)
        mid_points *= radius / np.linalg.norm(mid_points, axis=1)[:, None]
        
        
        vertices = np.concatenate([vertices, mid_points])
        indices = np.array(new_indices)
    
    return vertices, indices

def vert_lonlat(vert):
    lon = np.arctan2(vert[1], vert[0])
    lat = np.arcsin(vert[2])
    return np.array([lon, lat])

def _draw_texture(texture):
    plt.title("Texture map")
    plt.scatter(texture[:, 0], texture[:, 1])
    plt.show()

if __name__ == "__main__":
    v, i = create_icosphere(subdivisions=3)
    with open("utils/model.js", "w") as f:
        f.write("")
    with open("utils/model.js", "a") as f:
        f.write("const positions = [")
        for row in v:
            for c in row:
                f.write(f"{c},")
        f.write("];\n\nconst indices = [")
        for row in i:
            for c in row:
                f.write(f"{c},")
        f.write("];\n\nconst textureCoordinates = [")
        texture = np.apply_along_axis(vert_lonlat, 1, v) / (2*np.pi) + 0.5
        for row in texture:
            for c in row:
                f.write(f"{c},")
        f.write("];")
    
