(() => {
    const U=window.Universe; let context;
    U.gameSound={
        enabled:U.read('game-sound',true)!==false,
        toggle(){this.enabled=!this.enabled;U.save('game-sound',this.enabled);if(this.enabled)this.play();return this.enabled;},
        play(complete=false){
            if(!this.enabled)return;
            try {
                const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
                context ||= new Audio();context.resume().catch(()=>{});
                (complete?[523.25,659.25,783.99]:[540]).forEach((frequency,index)=>{
                    const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+index*.12;
                    oscillator.type='sine';oscillator.frequency.value=frequency;
                    gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.055,start+.008);gain.gain.exponentialRampToValueAtTime(.001,start+(complete?.42:.075));
                    oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+(complete?.45:.09));
                    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
                });
            } catch { /* Audio is optional on browsers that block it. */ }
        }
    };
})();
