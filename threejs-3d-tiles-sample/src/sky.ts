import * as THREE from "three";

export function createSimpleSky() {
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(5000, 32, 15),
    new THREE.ShaderMaterial({
      uniforms: {
        topColor: { value: new THREE.Color(0x89b7d6) },
        bottomColor: { value: new THREE.Color(0xeeeeee) },
        horizonColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        varying vec3 vPosition;
        void main() {
          float heightFactor = normalize(vPosition).y;
          if (heightFactor > 0.0) {
            heightFactor = sin(heightFactor * ${Math.PI} / 2.0);
            heightFactor = sin(heightFactor * ${Math.PI} / 2.0);
            gl_FragColor = vec4(mix(horizonColor, topColor, max(heightFactor, 0.0)), 1.0);
          } else {
            gl_FragColor = vec4(bottomColor, 1.0);
          }
        }
      `,
      side: THREE.BackSide,
    })
  );

  return sky;
}
