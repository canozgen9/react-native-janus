class JanusUtils {
    static log(...msg) {
        console.log('[Janus]:' + msg.map(msg => {
            if (typeof msg === 'object') {
                return JSON.stringify(msg);
            }
            return msg;
        }).join(', '));
    }

    static randomString(length) {
        const charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let randomString = '';
        for (let i = 0; i < length; i++) {
            const randomPoz = Math.floor(Math.random() * charSet.length);
            randomString += charSet.substring(randomPoz, randomPoz + 1);
        }
        return randomString;
    }
}

export default JanusUtils;
