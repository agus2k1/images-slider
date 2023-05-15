const fragmentShader = /* glsl */ `
    varying vec2 vUv;

    uniform vec2 uResolution;
    uniform float uAspectRatio;
    uniform sampler2D uTexture;
    uniform float uProgress;

    void main() {
        vec2 normUV = gl_FragCoord.xy / uResolution.xy;
        vec2 scale;

        if (uAspectRatio > 1.) {
            scale = vec2(1., 1. / uAspectRatio);
        } else {
            scale = vec2(uAspectRatio, 1.);
        }

        normUV = (normUV - vec2(0.5)) * scale * 1.5 + vec2(0.5);

        normUV.x -= uProgress;

        vec4 t = texture2D(uTexture, normUV);

        // gl_FragColor = vec4( normUV, 0., 1.);
        gl_FragColor = t;
    }
`;

export default fragmentShader;
