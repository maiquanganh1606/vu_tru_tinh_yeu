(() => {
    const U = window.Universe;
    U.CameraController = class {
        constructor(camera) {
            this.camera = camera; this.target = new THREE.Vector3(); this.home = new THREE.Vector3(0, 0, 620);
            this.pointer = { x: 0, y: 0 }; camera.position.copy(this.home);
        }
        move(position, target, done) {
            this.flight = { from: this.camera.position.clone(), look: this.target.clone(), to: position.clone(), target: target.clone(), elapsed: 0,
                duration: U.reduced ? .12 : 1.25, done };
        }
        reset(done) { this.move(this.home, new THREE.Vector3(), done); }
        update(dt) {
            if (this.flight) {
                const f = this.flight; f.elapsed += dt;
                const t = Math.min(1, f.elapsed / f.duration), ease = t * t * (3 - 2 * t);
                this.camera.position.lerpVectors(f.from, f.to, ease); this.target.lerpVectors(f.look, f.target, ease);
                if (t === 1) { this.flight = null; f.done?.(); }
            } else if (U.mode === 'EXPLORE') {
                const x = U.reduced || U.light ? 0 : this.pointer.x * 8, y = U.reduced || U.light ? 0 : this.pointer.y * 6;
                this.camera.position.x += (x - this.camera.position.x) * (1 - Math.exp(-dt*3));
                this.camera.position.y += (y - this.camera.position.y) * (1 - Math.exp(-dt*3));
                this.camera.position.z += (this.home.z - this.camera.position.z) * (1 - Math.exp(-dt*3));
                this.target.lerp(new THREE.Vector3(), 1 - Math.exp(-dt*3));
            }
            this.camera.lookAt(this.target);
        }
    };
})();
