### Video Room

```javascript
import {mediaDevices, MediaStream, RTCIceCandidate, RTCPeerConnection, RTCSessionDescription, RTCView} from 'react-native-webrtc';
import React from 'react';
import {Dimensions, FlatList, StatusBar, View} from 'react-native';
import {Janus, JanusVideoRoomPlugin} from 'react-native-janus';

Janus.setDependencies({
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    MediaStream,
});

class JanusVideoRoomScreen extends React.Component {
    constructor(props) {
        super(props);

        this.state = {
            stream: null,
            publishers: [],
        };
    }

    async receivePublisher(publisher) {
        try {
            let videoRoom = new JanusVideoRoomPlugin(this.janus);
            videoRoom.setRoomID(1234);
            videoRoom.setOnStreamListener((stream) => {
                this.setState(state => ({
                    publishers: [
                        ...state.publishers,
                        {
                            publisher: publisher,
                            stream: stream,
                        },
                    ],
                }));
            });

            await videoRoom.createPeer();
            await videoRoom.connect();
            await videoRoom.receive(this.videoRoom.getUserPrivateID(), publisher);
        } catch (e) {
            console.error(e);
        }
    }

    async removePublisher(publisherID) {
        try {
            this.setState(state => ({
                publishers: state.publishers.filter(pub => pub.publisher == null || pub.publisher.id !== publisherID),
            }));
        } catch (e) {
            console.error(e);
        }
    }

    async initJanus(stream) {
        try {
            this.setState(state => ({
                publishers: [
                    {
                        publisher: null,
                        stream: stream,
                    },
                ],
            }));

            this.janus = new Janus('ws://${YOUR_JANUS_ADDRESS]:8188');
            this.janus.setApiSecret('janusrocks');
            await this.janus.init();

            this.videoRoom = new JanusVideoRoomPlugin(this.janus);
            this.videoRoom.setRoomID(1234);
            this.videoRoom.setDisplayName('can');
            this.videoRoom.setOnPublishersListener((publishers) => {
                for (let i = 0; i < publishers.length; i++) {
                    this.receivePublisher(publishers[i]);
                }
            });
            this.videoRoom.setOnPublisherJoinedListener((publisher) => {
                this.receivePublisher(publisher);
            });
            this.videoRoom.setOnPublisherLeftListener((publisherID) => {
                this.removePublisher(publisherID);
            });
            this.videoRoom.setOnWebRTCUpListener(async () => {

            });

            await this.videoRoom.createPeer();
            await this.videoRoom.connect();
            await this.videoRoom.join();
            await this.videoRoom.publish(stream);

        } catch (e) {
            console.error('main', JSON.stringify(e));
        }
    }

    getMediaStream = async () => {
        let isFront = true;
        let sourceInfos = await mediaDevices.enumerateDevices();
        let videoSourceId;
        for (let i = 0; i < sourceInfos.length; i++) {
            const sourceInfo = sourceInfos[i];
            console.log(sourceInfo);
            if (sourceInfo.kind == 'videoinput' && sourceInfo.facing == (isFront ? 'front' : 'environment')) {
                videoSourceId = sourceInfo.deviceId;
            }
        }

        let stream = await mediaDevices.getUserMedia({
            audio: true,
            video: {
                facingMode: (isFront ? 'user' : 'environment'),
            },
        });
        await this.initJanus(stream);
    };

    async componentDidMount() {
        this.getMediaStream();
    }

    componentWillUnmount = async () => {
        if (this.janus) {
            await this.janus.destroy();
        }
    };

    renderView() {
    }

    render() {
        return (
            <View style={{flex: 1, width: '100%', height: '100%', backgroundColor: '#000000', flexDirection: 'row'}}>
                <StatusBar translucent={true} barStyle={'light-content'}/>
                <FlatList
                    data={this.state.publishers}
                    numColumns={2}
                    keyExtractor={(item, index) => {
                        if (item.publisher === null) {
                            return `rtc-default`;
                        }
                        return `rtc-${item.publisher.id}`;
                    }}
                    renderItem={({item}) => (
                        <RTCView style={{
                            flex: 1,
                            height: (Dimensions.get('window').height / 2),
                        }} objectFit={'cover'} streamURL={item.stream.toURL()}/>
                    )}
                />
            </View>
        );
    }
}

export default JanusVideoRoomScreen;
```
