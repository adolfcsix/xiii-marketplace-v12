import {NXA_ENERGY_ORB_CONFIGURABLE_FRAGMENT_SHADER} from '../components/threeui-energy/energyOrbShaders';
// Derived shader: retain the ThreeUI noise, sphere normal and lighting algorithms.
// Add a two-axis view rotation to the surface pattern; canonical sources stay intact.
const source=NXA_ENERGY_ORB_CONFIGURABLE_FRAGMENT_SHADER;
const anchor='vec3 sp=rot*n;';
if(!source.includes(anchor))throw new Error('ThreeUI orb shader rotation anchor changed');
export const STREET_ORB_FRAGMENT=source.replace('uniform float uT;uniform vec2 uR;','uniform float uT;uniform vec2 uR;uniform vec2 uLook;').replace(anchor,`float ax=uLook.y*0.45;float ay=uLook.x*0.55;
mat3 rx=mat3(1.,0.,0.,0.,cos(ax),sin(ax),0.,-sin(ax),cos(ax));
mat3 ry=mat3(cos(ay),0.,sin(ay),0.,1.,0.,-sin(ay),0.,cos(ay));
vec3 sp=rot*ry*rx*n;`);
