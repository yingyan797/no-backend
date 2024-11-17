// graphics function
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  
    // Create the shader program
  
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
  
    // If creating the shader program failed, alert
  
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      alert(
        `Unable to initialize the shader program: ${gl.getProgramInfoLog(
          shaderProgram,
        )}`,
      );
      return null;
    }
    return shaderProgram;
}
  
// creates a shader of the given type, uploads the source and compiles it.
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    // See if it compiled successfully
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(
        `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`,
        );
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
  
function graph() {
    const canvas = document.querySelector("#earth_shad");
    const gl = canvas.getContext("webgl");
    if (gl === null) {
        alert("Unavle to view earth due to browser limitation");
        return;
    }

  const vsSource = `
    attribute vec4 aVertexPosition;
    attribute vec3 aVertexNormal;
    attribute vec4 aVertexColor;

    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    uniform mat4 uNormalMatrix;
    uniform vec3 uLightDirection;
    uniform vec3 uAmbientColor;
    uniform vec3 uDiffuseColor;
    uniform vec3 uSpecularColor;
    uniform float uShininess;

    varying lowp vec4 vColor;

    void main(void) {
      gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
      vec3 normal = normalize(vec3(uNormalMatrix * vec4(aVertexNormal, 0.0)));
      
      vec3 lightDir = normalize(mat3(uModelViewMatrix) * uLightDirection);
      
      // float diffuseFactor = max(dot(normal, lightDir), 0.0);
      float diffuseFactor = dot(normal, lightDir);

      if (diffuseFactor < 0.0) {
        diffuseFactor = 0.0;
      } else if (diffuseFactor < 0.3) {
        diffuseFactor += 0.7;
      } else {
        diffuseFactor = 1.0;
      }
      
      vec3 viewDir = normalize(-vec3(uModelViewMatrix * aVertexPosition));
      vec3 reflectDir = reflect(-lightDir, normal);
      float specularFactor = pow(max(dot(viewDir, reflectDir), 0.0), uShininess);
      
      vec3 ambient = uAmbientColor * vec3(aVertexColor);
      vec3 diffuse = uDiffuseColor * vec3(aVertexColor) * diffuseFactor;
      vec3 specular = uSpecularColor * specularFactor;
      
      vColor = vec4(ambient + diffuse + specular, aVertexColor.a);
    }
  `;

  // Fragment shader program

  const fsSource = `
    varying lowp vec4 vColor;

    void main(void) {
      gl_FragColor = vColor;
    }
  `;
  const camera = new Camera();
  const light = new LightSource([1.0, 1.0, 1.0]);
  light.updateDirection(new Date(document.getElementById("date_shad").value), document.getElementById("time_shad").value);
  camera.moveTo(document.getElementById("lon_shad").value, document.getElementById("lat_shad").value);
  const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
  const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
        vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
        vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(
          shaderProgram,
          "uProjectionMatrix"
        ),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
        normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
        lightDirection: gl.getUniformLocation(shaderProgram, 'uLightDirection'),
        ambientColor: gl.getUniformLocation(shaderProgram, 'uAmbientColor'),
        diffuseColor: gl.getUniformLocation(shaderProgram, 'uDiffuseColor'),
        specularColor: gl.getUniformLocation(shaderProgram, 'uSpecularColor'),
        shininess: gl.getUniformLocation(shaderProgram, 'uShininess'),
      },
    };

    const buffers = initBuffers(gl);
    // Load texture
    // const texture = loadTexture(gl, "https://yingyan797.github.io/no-backend/static/rect-satellite-texture.png");
    // Flip image pixels into the bottom-to-top order that WebGL expects.
    // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    drawScene(gl, programInfo, buffers, camera, light);
}

function loadTexture(gl, url) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // Because images have to be downloaded over the internet
  // they might take a moment until they are ready.
  // Until then put a single pixel in the texture so we can
  // use it immediately. When the image has finished downloading
  // we'll update the texture with the contents of the image.
  const level = 0;
  const internalFormat = gl.RGBA;
  const width = 1;
  const height = 1;
  const border = 0;
  const srcFormat = gl.RGBA;
  const srcType = gl.UNSIGNED_BYTE;
  const pixel = new Uint8Array([0, 0, 255, 255]); // opaque blue
  gl.texImage2D(
    gl.TEXTURE_2D,
    level,
    internalFormat,
    width,
    height,
    border,
    srcFormat,
    srcType,
    pixel
  );

  const image = new Image();
  image.crossOrigin = "anonymous"
  image.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      level,
      internalFormat,
      srcFormat,
      srcType,
      image
    );

    // WebGL1 has different requirements for power of 2 images
    // vs non power of 2 images so check if the image is a
    // power of 2 in both dimensions.
    if (isPowerOf2(image.width) && isPowerOf2(image.height)) {
      // Yes, it's a power of 2. Generate mips.
      gl.generateMipmap(gl.TEXTURE_2D);
    } else {
      // No, it's not a power of 2. Turn off mips and set
      // wrapping to clamp to edge
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    }
  };
  image.src = url;
  return texture;
}

function isPowerOf2(value) {
  return (value & (value - 1)) === 0;
}

// init buffer
function initBuffers(gl) {
  const positionBuffer = initPositionBuffer(gl);
  const colorBuffer = initColorBuffer(gl);
  const indexBuffer = initIndexBuffer(gl);
  const normalBuffer = initNormalBuffer(gl);

  return {
    position: positionBuffer,
    color: colorBuffer,
    indices: indexBuffer,
    normal: normalBuffer
  };
}
  
function initPositionBuffer(gl) {
    // Create a buffer for the square's positions.
    const positionBuffer = gl.createBuffer();
  
    // Select the positionBuffer as the one to apply buffer
    // operations to from here out.
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  
    // Now create an array of positions for the square.
    // const positions = [1.0, 1.0, -1.0, 1.0, 1.0, -1.0, -1.0, -1.0];
  
    // Now pass the list of positions into WebGL to build the
    // shape. We do this by creating a Float32Array from the
    // JavaScript array, then use it to fill the current buffer.
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(earth_vertices), gl.STATIC_DRAW);
  
    return positionBuffer;
}

function initNormalBuffer(gl) {
  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(earth_vertices), gl.STATIC_DRAW);
  return normalBuffer;
}

function initColorBuffer(gl) {
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vert_colors), gl.STATIC_DRAW);

  return colorBuffer;
}

function initTextureBuffer(gl) {
  const textureCoordBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array(textureCoordinates),
    gl.STATIC_DRAW,
  );
  return textureCoordBuffer;
}

function initIndexBuffer(gl) {
  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.
  // Now send the element array to GL

  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint16Array(earth_indices),
    gl.STATIC_DRAW,
  );

  return indexBuffer;
}

class Camera {
  constructor() {
    this.distance = document.getElementById("radius_shad").value;
    this.position = vec3.fromValues(0, 0, 5);
    // Initial target position (looking down negative z-axis)
    this.target = vec3.fromValues(0, 0, 0);
    // Up vector
    this.up = vec3.fromValues(0, 0, 1);
    // View matrix
    this.viewMatrix = mat4.create();
    this.updateViewMatrix();
  }

  updateViewMatrix() {
    mat4.lookAt(this.viewMatrix, this.position, this.target, this.up);
  }

  // Move camera to new position while looking at origin
  moveTo(longitude, latitude) {
      const lon = longitude * Math.PI / 180;
      const lat = latitude * Math.PI / 180;
      
      // Calculate Cartesian coordinates
      const x = this.distance * Math.cos(lat) * Math.cos(lon);
      const y = this.distance * Math.cos(lat) * Math.sin(lon);
      const z = this.distance * Math.sin(lat);
      
      // Set new position
      vec3.set(this.position, x, y, z);
      // Set target to origin (0,0,0)
      vec3.set(this.target, 0, 0, 0);
      this.updateViewMatrix();
  }
}

class LightSource {
  constructor(direction) {
      this.direction = vec3.normalize(vec3.create(), direction);
      this.ambientColor = vec3.fromValues(0.25, 0.25, 0.25);  // Low intensity white
      this.diffuseColor = vec3.fromValues(1.0, 1.0, 1.0);  // White
      this.specularColor = vec3.fromValues(0.5, 0.45, 0.3); // White
      this.shininess = 16.0;  // Material shininess
  }

  updateDirection(date, secs) {
    const sinlat0 = sun_direct_lat_sin(date);
    const proj = sin_to_cos(sinlat0);
    const dlon = Math.PI * (1-2*secs/86400);
    const i = proj*Math.cos(dlon);
    const j =  proj*Math.sin(dlon);
    const k = sinlat0;
      vec3.set(this.direction, i, j, k);
      vec3.normalize(this.direction, this.direction);
  }
}


// draw scene
function drawScene(gl, programInfo, buffers, camera, light) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
    gl.clearDepth(1.0); // Clear everything
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
  
    // Clear the canvas before we start drawing on it.
  
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  
    // Create a perspective matrix, a special matrix that is
    // used to simulate the distortion of perspective in a camera.
    // Our field of view is 45 degrees, with a width/height
    // ratio that matches the display size of the canvas
    // and we only want to see objects between 0.1 units
    // and 100 units away from the camera.
  
    const fieldOfView = (25 * Math.PI) / 180; // in radians
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const zNear = 0.7;
    const zFar = 10.0;
    const projectionMatrix = mat4.create();
  
    // note: glMatrix always has the first argument
    // as the destination to receive the result.
    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);
  
    // Set the drawing position to the "identity" point, which is
    // the center of the scene.
    const modelViewMatrix = mat4.create();
    mat4.multiply(modelViewMatrix, camera.viewMatrix, modelViewMatrix);
    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

     // Calculate normal matrix
    const normalMatrix = mat4.create();
    mat4.invert(normalMatrix, modelViewMatrix);
    mat4.transpose(normalMatrix, normalMatrix);
    // Set shader uniforms
    gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);
    gl.uniformMatrix4fv(programInfo.uniformLocations.normalMatrix, false, normalMatrix);
    // Set lighting uniforms
    gl.uniform3fv(programInfo.uniformLocations.lightDirection, light.direction);
    gl.uniform3fv(programInfo.uniformLocations.ambientColor, light.ambientColor);
    gl.uniform3fv(programInfo.uniformLocations.diffuseColor, light.diffuseColor);
    gl.uniform3fv(programInfo.uniformLocations.specularColor, light.specularColor);
    gl.uniform1f(programInfo.uniformLocations.shininess, light.shininess);
  
    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute.
    setPositionAttribute(gl, buffers, programInfo);
    setColorAttribute(gl, buffers, programInfo);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  
    // Set the shader uniforms
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.projectionMatrix,
      false,
      projectionMatrix,
    );
    gl.uniformMatrix4fv(
      programInfo.uniformLocations.modelViewMatrix,
      false,
      modelViewMatrix,
    );
    // // Tell WebGL we want to affect texture unit 0
    // gl.activeTexture(gl.TEXTURE0);

    // // Bind the texture to texture unit 0
    // gl.bindTexture(gl.TEXTURE_2D, texture);

    // Tell the shader we bound the texture to texture unit 0
    // gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
  
    {
      const vertexCount = earth_indices.length;
      const type = gl.UNSIGNED_SHORT;
      const offset = 0;
      gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
}
  
// Tell WebGL how to pull out the positions from the position
// buffer into the vertexPosition attribute.
function setPositionAttribute(gl, buffers, programInfo) {
    const numComponents = 3; // pull out 2 values per iteration
    const type = gl.FLOAT; // the data in the buffer is 32bit floats
    const normalize = false; // don't normalize
    const stride = 0; // how many bytes to get from one set of values to the next
    // 0 = use type and numComponents above
    const offset = 0; // how many bytes inside the buffer to start from
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
    gl.vertexAttribPointer(
      programInfo.attribLocations.vertexPosition,
      numComponents,
      type,
      normalize,
      stride,
      offset,
    );
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexNormal,
        numComponents,
        type,
        normalize,
        stride,
        offset,);
    gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
}

function setColorAttribute(gl, buffers, programInfo) {
  const numComponents = 4;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
  gl.vertexAttribPointer(
    programInfo.attribLocations.vertexColor,
    numComponents,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
}

function setTextureAttribute(gl, buffers, programInfo) {
  const num = 2; // every coordinate composed of 2 values
  const type = gl.FLOAT; // the data in the buffer is 32-bit float
  const normalize = false; // don't normalize
  const stride = 0; // how many bytes to get from one set to the next
  const offset = 0; // how many bytes inside the buffer to start from
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
  gl.vertexAttribPointer(
    programInfo.attribLocations.textureCoord,
    num,
    type,
    normalize,
    stride,
    offset,
  );
  gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
}