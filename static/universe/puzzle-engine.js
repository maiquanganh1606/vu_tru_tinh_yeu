/* Pure sliding-board rules; also usable by Node's test runner. */
(function (root) {
    const solved = n => Array.from({length:n*n}, (_, i) => i);
    const complete = board => board.every((value, i) => value === i);
    function neighbors(blank, n) {
        return [blank-n, blank+n, blank-1, blank+1].filter(i => i >= 0 && i < n*n && Math.abs(i%n-blank%n)+Math.abs(Math.floor(i/n)-Math.floor(blank/n)) === 1);
    }
    function move(board, index, n) {
        const blank = board.indexOf(n*n-1);
        if (!neighbors(blank,n).includes(index)) return null;
        const next = [...board]; [next[index],next[blank]] = [next[blank],next[index]]; return next;
    }
    function shuffle(n, steps, random = Math.random) {
        let board = solved(n), blank=n*n-1, previous=-1;
        for (let step=0;step<steps;step++) {
            const choices=neighbors(blank,n).filter(i=>i!==previous);
            const index=choices[Math.min(choices.length-1,Math.floor(random()*choices.length))];
            board=move(board,index,n); previous=blank; blank=index;
        }
        if (complete(board)) board=move(board,neighbors(blank,n)[0],n);
        return board;
    }
    function better(candidate, old) { return !old || candidate.elapsedMs<old.elapsedMs || (candidate.elapsedMs===old.elapsedMs && candidate.moves<old.moves); }
    const api={solved,complete,neighbors,move,shuffle,better};
    if(typeof module!=='undefined' && module.exports) module.exports=api;
    else root.PuzzleEngine=api;
})(globalThis);
