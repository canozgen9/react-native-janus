import JanusPlugin from './JanusPlugin';
import JanusUtils from './JanusUtils';

export default class JanusSocket {
    constructor(address) {
        this.address = address;
        this.transactions = {};
        this.plugins = {};
        this.senders = {};
        this.sessionID = null;
        this.connected = false;
        this.keepAliveTimeoutID = null;
    }

    /**
     *
     * @param {JanusPlugin} plugin
     */
    attachPlugin = (plugin) => {
        this.plugins[plugin.handleID] = plugin;
    };

    /**
     *
     * @param {JanusPlugin} plugin
     */
    detachPlugin = (plugin) => {
        delete this.plugins[plugin.handleID];
    };

    connect = () => {
        return new Promise(((resolve, reject) => {
            this.ws = new WebSocket(this.address, ['janus-protocol']);

            this.ws.onopen = () => {
                this.send({
                    'janus': 'create',
                }, async (response) => {
                    if (response.janus === 'success') {
                        this.sessionID = response.data.id;
                        this.connected = true;
                        this.setKeepAliveTimeout();
                        resolve();
                    } else {
                        //todo: send error
                        reject();
                    }
                });
            };

            this.ws.onmessage = async (e) => {
                try {
                    let message = JSON.parse(e.data);

                    switch (message.janus) {
                        // general events
                        case 'keepalive':
                        case 'ack':
                        case 'timeout': {
                            return await this.onMessage(message);
                        }

                        // plugin events
                        case 'trickle':
                        case 'webrtcup':
                        case 'hangup':
                        case 'detached':
                        case 'media':
                        case 'slowlink':
                        case 'event': {
                            if (message.transaction) {
                                const {transaction} = message;
                                await this.transactions[transaction](message);
                                return delete this.transactions[transaction];
                            } else {
                                return await this.plugins[message.sender].onMessage(message);
                            }
                        }

                        // transaction responses
                        case 'success':
                        case 'error': {
                            if (message.transaction) {
                                const {transaction} = message;
                                await this.transactions[transaction](message);
                                delete this.transactions[transaction];
                                return;
                            }
                        }
                    }

                    if (message.janus && message.janus !== 'ack' && message.transaction) {
                        const {transaction} = message;
                        await this.transactions[transaction](message);
                        delete this.transactions[transaction];
                    } else {
                        if (message.sender && this.plugins[message.sender] && this.plugins[message.sender].onMessage) {
                            await this.plugins[message.sender].onMessage(message);
                        } else {
                            await this.onMessage(message);
                        }
                    }
                } catch (e) {

                }
            };

            this.ws.onerror = (e) => {
                JanusUtils.log('socket_error', e);
            };

            this.ws.onclose = (e) => {
                JanusUtils.log('socket_closed', e.code, e.reason);
            };
        }));
    };

    disconnect = async () => {
        this.ws.close();
    };

    onMessage = async (message) => {

    };

    send = (request, callback = null, transaction = null) => {
        if (!transaction && typeof callback === 'function') {
            transaction = JanusUtils.randomString(12);
            this.transactions[transaction] = callback;
        }

        request['transaction'] = transaction;

        this.ws.send(JSON.stringify(request));
    };

    sendAsync = (request) => {
        return new Promise((resolve, reject) => {
            this.send(request, (response) => {
                if (response.janus !== 'error') {
                    resolve(response);
                } else {
                    reject(response);
                }
            });
        });
    };

    keepAlive = () => {
        if (this.connected) {
            this.setKeepAliveTimeout();
            this.send({
                'janus': 'keepalive',
                'session_id': this.sessionID,
            }, (response) => {
                // JanusUtils.log('keepAlive', response.session_id);
            });
        }
    };

    setKeepAliveTimeout = () => {
        if (this.connected) {
            this.keepAliveTimeoutID = setTimeout(this.keepAlive, 25000);
        }
    };
}
