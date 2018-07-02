import React from 'react';
import {
    StatusBar,
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Dimensions,
    Image,
    AsyncStorage,
    Alert,
    Modal, TextInput,
} from "react-native";
import Ionicons from "react-native-vector-icons/Ionicons";
import ImagePicker from 'react-native-image-picker';
import {config} from "../utils/Config";
import HttpUtils from "../utils/HttpUtils";
import * as Progress from 'react-native-progress';
import {Button} from 'react-native-elements';
import ActionButton from "react-native-button";

let width = Dimensions.get('window').width;

const photoOptions = {
    title: 'Select Avatar',
    cancelButtonTitle: 'Cancel',
    takePhotoButtonTitle: 'Take Photo',
    chooseFromLibraryButtonTitle: 'Choose from album',
    quality: 0.75,
    allowsEditing: true,
    noData: false,
    storageOptions: {
        skipBackup: true,
        path: 'images'
    }
};

export default class Profile extends React.Component {

    constructor(props) {
        super(props);
        let user = this.props.screenProps.user || {};
        this.state = {
            user: user,
            avatarProgress: 0,
            avatarUploading: false,
            modalVisible: false
        }
    }

    _edit() {
        this.setState({
            modalVisible: true
        });
    }

    _closeModal() {
        this.setState({
            modalVisible: false
        });
    }

    componentDidMount() {
        this._getUser();
    }

    avatar(id, type) {
        if (id.indexOf('http') > -1) {
            return id;
        }

        if (id.indexOf('data:image') > -1) {
            return id;
        }

        if (id.indexOf('avatar/') > -1) {
            return config.cloudinary.base + '/' + type + '/upload/' + id;
        }

        console.log('http://pb3k12o07.bkt.clouddn.com/' + id);

        return 'http://pb3k12o07.bkt.clouddn.com/' + id;
    }

    _getUser() {
        let that = this;

        AsyncStorage.getItem('user')
            .then((data) => {
                let user;
                if (data) {
                    user = JSON.parse(data);
                }

                console.log(user.nickname);
                if (user.accessToken !== null) {
                    that.setState({
                        user: user
                    });
                }
            })
            .catch((error) => {
                console.log(error);
            });
    }

    _getQiniuToken() {
        let accessToken = this.state.user.accessToken;
        let signatureURL = config.api.base + config.api.signature;

        return HttpUtils.post(signatureURL, {
            accessToken: accessToken,
            type: 'avatar',
            cloud: 'qiniu'
        })
            .catch((error) => {
                console.log(error);
            })
    }

    _pickPhoto() {
        let that = this;

        ImagePicker.showImagePicker(photoOptions, (response) => {
            if (response.didCancel) {
                return;
            }

            let uri = response.uri;

            that._getQiniuToken()
                .then((data) => {
                    if (data && data.success) {
                        let token = data.data.token;
                        let key = data.data.key;
                        let body = new FormData();

                        body.append('token', token);
                        body.append('key', key);
                        body.append('file', {
                            type: 'image/jpeg',
                            uri: uri,
                            name: key
                        });

                        that._upload(body);
                    }
                })

        });
    }

    _upload(body) {
        let that = this;
        let xhr = new XMLHttpRequest();
        let url = config.qiniu.upload;

        this.setState({
            avatarUploading: true,
            avatarProgress: 0
        });

        xhr.open('POST', url);

        xhr.onload = (() => {
            if (xhr.status !== 200) {
                Alert.alert('Request failed');
                console.log(xhr.responseText);
                return;
            }

            if (!xhr.responseText) {
                Alert.alert('Request failed');
                return;
            }

            let response;

            try {
                response = JSON.parse(xhr.response);
            } catch (e) {
                console.log(e);
                console.log('parse fails');
            }

            if (response) {
                let user = this.state.user;

                if (response.public_id) {
                    user.avatar = response.public_id;
                }

                if (response.key) {
                    user.avatar = response.key;
                }

                that.setState({
                    avatarUploading: false,
                    avatarProgress: 0,
                    user: user
                });

                that._asyncUser(true);
            }
        });

        if (xhr.upload) {
            let that = this;
            xhr.upload.onprogress = ((event) => {
                if (event.lengthComputable) {
                    let percent = Number((event.loaded / event.total).toFixed(2));
                    that.setState({
                        avatarProgress: percent
                    });
                }
            });
        }

        xhr.send(body);
    }

    _asyncUser(isAvatar) {
        let that = this;
        let user = this.state.user;

        if (user && user.accessToken) {
            let url = config.api.base + config.api.update;

            HttpUtils.post(url, user)
                .then((data) => {
                    if (data && data.success) {
                        let user = data.data;

                        if (isAvatar) {
                            Alert.alert('Avatar update success');
                        }

                        that.setState({
                            user: user
                        }, () => {
                            that._closeModal();
                            AsyncStorage.setItem('user', JSON.stringify(user));
                        });
                    }
                })
        }
    }

    _changeUserState(key, value) {
        let user = this.state.user;
        // change user state according to the text input
        user[key] = value;
        this.setState({
            user: user
        });
    }

    _submit() {
        console.log(this.state.user);
        this._asyncUser();
    }


    render() {
        let user = this.state.user;

        return (
            <View style={styles.container}>
                <StatusBar
                    barStyle="light-content"
                    backgroundColor="#ee735c"
                />

                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Your Account</Text>
                    <Text style={styles.toolbarEdit} onPress={() => this._edit()}>EDITT</Text>
                </View>

                {
                    user.avatar
                        ? <TouchableOpacity
                            onPress={() => this._pickPhoto()}
                            style={styles.avatarContainer}>
                            <View style={styles.avatarBox}>
                                {
                                    this.state.avatarUploading
                                        ? <Progress.Circle
                                            size={75}
                                            showsText={true}
                                            color={'#ee735c'}
                                            progress={this.state.avatarProgress}/>
                                        : <Image
                                            source={{uri: this.avatar(user.avatar, 'image')}}
                                            style={styles.avatar}/>
                                }
                                <Text style={styles.avatarTip}>Change your avatar</Text>
                            </View>
                        </TouchableOpacity>
                        : <TouchableOpacity
                            onPress={() => this._pickPhoto()}
                            style={styles.avatarContainer}>

                            <Text style={styles.avatarTip}>Add your avatar</Text>

                            <View style={styles.avatarBox}>
                                {
                                    this.state.avatarUploading
                                        ? <Progress.Circle
                                            size={75}
                                            showsText={true}
                                            color={'#ee735c'}
                                            progress={this.state.avatarProgress}/>
                                        : <Ionicons
                                            name={'ios-cloud-upload-outline'}
                                            style={styles.plusIcon}/>
                                }
                            </View>
                        </TouchableOpacity>
                }

                <Modal
                    animationType={'fade'}
                    visible={this.state.modalVisible}
                    onRequestClose={() => {
                        alert('Modal has been closed.');
                    }}>
                    <View style={styles.modalContainer}>
                        <Ionicons
                            name={'ios-close-outline'}
                            style={styles.closeIcon}
                            onPress={() => this._closeModal()}/>

                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>NickName</Text>
                            <TextInput
                                placeholder={'Input your nickname'}
                                style={styles.inputField}
                                autoCapitalize={'none'}
                                autoCorrect={true}
                                defaultValue={user.nickname}
                                onChangeText={(text) => {
                                    this._changeUserState('nickname', text);
                                }}/>
                        </View>

                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>Type</Text>
                            <TextInput
                                placeholder={'Input the type'}
                                style={styles.inputField}
                                autoCapitalize={'none'}
                                autoCorrect={true}
                                defaultValue={user.breed}
                                onChangeText={(text) => {
                                    this._changeUserState('breed', text);
                                }}/>
                        </View>

                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>Age</Text>
                            <TextInput
                                placeholder={'Input the age'}
                                style={styles.inputField}
                                autoCapitalize={'none'}
                                autoCorrect={true}
                                defaultValue={user.age}
                                keyboardType={'phone-pad'}
                                onChangeText={(text) => {
                                    this._changeUserState('age', text);
                                }}/>
                        </View>

                        <View style={styles.fieldItem}>
                            <Text style={styles.label}>Sex</Text>
                            <Button
                                leftIcon={{
                                    name: 'ios-male-outline',
                                    type: 'ionicon'
                                }}
                                onPress={() => {
                                    this._changeUserState('gender', 'male')
                                }}
                                buttonStyle={[styles.gender, user.gender === 'male' && styles.genderChecked]}
                                title='male'/>

                            <Button
                                leftIcon={{
                                    name: 'ios-female-outline',
                                    type: 'ionicon'
                                }}
                                onPress={() => {
                                    this._changeUserState('gender', 'female')
                                }}
                                buttonStyle={[styles.gender, user.gender === 'female' && styles.genderChecked]}
                                title='female'/>
                        </View>

                        <ActionButton
                            style={styles.btn}
                            onPress={() => this._submit()}>Save Profile</ActionButton>

                    </View>
                </Modal>

                <ActionButton
                    style={styles.btn}
                    onPress={this.props.screenProps.logout}>Logout</ActionButton>

            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5FCFF'
    },
    header: {
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: '#ee735c',
        flexDirection: 'row'
    },
    headerTitle: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        fontWeight: '600'
    },
    toolbarEdit: {
        position: 'absolute',
        right: 14,
        top: 14,
        color: '#fff',
        textAlign: 'right',
        fontWeight: '600',
        fontSize: 14
    },
    avatarContainer: {
        width: width,
        height: 140,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#666'
    },
    avatarBox: {
        marginTop: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    plusIcon: {
        padding: 20,
        paddingLeft: 25,
        paddingRight: 25,
        color: '#999',
        fontSize: 24,
        backgroundColor: '#fff',
        borderRadius: 8
    },
    avatarTip: {
        color: '#fff',
        backgroundColor: 'transparent',
        fontSize: 14
    },
    avatar: {
        marginBottom: 15,
        width: width * 0.2,
        height: width * 0.2,
        resizeMode: 'cover',
        borderRadius: width * 0.1
    },
    modalContainer: {
        flex: 1,
        paddingTop: 50,
        backgroundColor: '#fff'
    },
    closeIcon: {
        position: 'absolute',
        width: 40,
        height: 40,
        fontSize: 32,
        right: 20,
        top: 30,
        color: '#ee735c'
    },
    fieldItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        height: 50,
        paddingLeft: 15,
        paddingRight: 15,
        borderColor: '#eee',
        borderBottomWidth: 1,
    },
    label: {
        color: '#ccc',
        marginRight: 10,
    },
    inputField: {
        flex: 1,
        height: 50,
        color: '#666',
        fontSize: 14
    },
    gender: {
        backgroundColor: '#ccc'
    },
    genderChecked: {
        backgroundColor: '#ee735c'
    },
    btn: {
        padding: 10,
        marginTop: 10,
        marginLeft: 10,
        marginRight: 10,
        backgroundColor: 'transparent',
        borderColor: '#ee735c',
        borderWidth: 1,
        borderRadius: 4,
        color: '#ee735c'
    },

});