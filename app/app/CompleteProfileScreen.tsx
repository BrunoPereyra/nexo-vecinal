import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Platform,
    KeyboardAvoidingView,
    ScrollView
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { CompleteGoogleProfile } from '@/services/authService';
import colors from '@/style/colors';
import { savePushToken } from '@/services/userService';

WebBrowser.maybeCompleteAuthSession();

export default function CompleteProfileScreen() {
    const { login, pushToken } = useAuth();
    const router = useRouter();
    const params = useLocalSearchParams<{ email: string; fullName: string; avatar: string }>();

    // Pre‑llenado de Google
    const email = params.email!;
    const fullName = params.fullName!;
    const avatar = params.avatar!;

    // Campos editables
    const [nameUser, setNameUser] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [birthDate, setBirthDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [gender, setGender] = useState<'Masculino' | 'Femenino'>('Masculino');
    const [intention, setIntention] = useState<'hire' | 'work'>('hire');
    const [referral, setReferral] = useState<'amigo' | 'instagram' | 'facebook'>('amigo');
    const [errorMessage, setErrorMessage] = useState('');

    const getDisplayBirthDate = () => {
        const dd = String(birthDate.getDate()).padStart(2, '0');
        const mm = String(birthDate.getMonth() + 1).padStart(2, '0');
        const yyyy = birthDate.getFullYear();
        return `${dd}-${mm}-${yyyy}`;
    };

    const handleDateChange = (_: any, selected?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selected) setBirthDate(selected);
    };

    const handleSubmit = async () => {
        setErrorMessage('');
        if (password !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden');
            return;
        }
        if (password.length < 8) {
            setErrorMessage('La contraseña debe tener al menos 8 caracteres');
            return;
        }

        try {
            const formattedBirth = `${birthDate.getFullYear()}-${String(birthDate.getMonth() + 1).padStart(2, '0')}-${String(birthDate.getDate()).padStart(2, '0')}`;
            const data = await CompleteGoogleProfile({
                email,
                nameUser,
                password,
                FullName: fullName,
                Avatar: avatar,
                BirthDates: formattedBirth,
                Gender: gender,
                Intentions: intention,
                Referral: referral,
            });
            // Hacer login con el token recibido
            await login(data.data, data._id, data.avatar, data.nameUser);
            await savePushToken(data.data, pushToken || '');
            router.replace('/(protected)/profile/Profile');
        } catch (err: any) {
            console.log('err:', err);
            setErrorMessage(err.message || 'Error al completar perfil');
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.flex}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
            <ScrollView
                contentContainerStyle={[styles.container, { flexGrow: 1 }]}
                keyboardShouldPersistTaps='handled'
            >
                <View style={styles.inner}>
                    <Text style={styles.title}>Completa tu perfil</Text>
                    {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                    {/* Email bloqueado */}
                    <Text style={styles.label}>Email</Text>
                    <TextInput style={[styles.input, styles.disabled]} value={email} editable={false} />

                    {/* Nombre completo bloqueado */}
                    <Text style={styles.label}>Nombre completo</Text>
                    <TextInput style={[styles.input, styles.disabled]} value={fullName} editable={false} />

                    {/* Nombre de usuario */}
                    <Text style={styles.label}>Nombre de usuario</Text>
                    <TextInput
                        style={styles.input}
                        placeholder='Nombre de usuario'
                        placeholderTextColor='#888'
                        value={nameUser}
                        onChangeText={setNameUser}
                    />

                    {/* Contraseña */}
                    <Text style={styles.label}>Contraseña</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, styles.inputWithIcon]}
                            placeholder='Contraseña'
                            placeholderTextColor='#888'
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />
                        <Ionicons name='lock-closed' size={20} color={colors.gold} style={styles.iconRight} />
                    </View>

                    {/* Confirmar contraseña */}
                    <Text style={styles.label}>Confirmar contraseña</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={[styles.input, styles.inputWithIcon]}
                            placeholder='Confirmar contraseña'
                            placeholderTextColor='#888'
                            secureTextEntry
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                        />
                        <Ionicons name='lock-closed' size={20} color={colors.gold} style={styles.iconRight} />
                    </View>

                    {/* Fecha de nacimiento */}
                    <TouchableOpacity
                        style={styles.datePickerButton}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Text style={styles.datePickerText}>
                            Fecha de nacimiento: {getDisplayBirthDate()}
                        </Text>
                    </TouchableOpacity>
                    {showDatePicker && (
                        <DateTimePicker
                            value={birthDate}
                            mode='date'
                            display='default'
                            maximumDate={new Date()}
                            onChange={handleDateChange}
                        />
                    )}

                    {/* Género */}
                    <Text style={styles.label}>Género</Text>
                    <View style={styles.genderOptions}>
                        {['Masculino', 'Femenino'].map(g => (
                            <TouchableOpacity
                                key={g}
                                style={styles.genderOption}
                                onPress={() => setGender(g as any)}
                            >
                                <Ionicons
                                    name={gender === g ? 'radio-button-on' : 'radio-button-off'}
                                    size={24}
                                    color={gender === g ? colors.gold : '#888'}
                                />
                                <Text style={styles.optionText}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Intención */}
                    <Text style={styles.label}>Intención</Text>
                    <View style={styles.genderOptions}>
                        <TouchableOpacity
                            style={styles.genderOption}
                            onPress={() => setIntention('hire')}
                        >
                            <Ionicons
                                name={intention === 'hire' ? 'radio-button-on' : 'radio-button-off'}
                                size={24}
                                color={intention === 'hire' ? colors.gold : '#888'}
                            />
                            <Text style={styles.optionText}>Contratar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.genderOption}
                            onPress={() => setIntention('work')}
                        >
                            <Ionicons
                                name={intention === 'work' ? 'radio-button-on' : 'radio-button-off'}
                                size={24}
                                color={intention === 'work' ? colors.gold : '#888'}
                            />
                            <Text style={styles.optionText}>Trabajar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Referencia */}
                    <Text style={styles.label}>Referencia</Text>
                    <View style={styles.genderOptions}>
                        {['amigo', 'instagram', 'facebook'].map(r => (
                            <TouchableOpacity
                                key={r}
                                style={styles.genderOption}
                                onPress={() => setReferral(r as any)}
                            >
                                <Ionicons
                                    name={referral === r ? 'radio-button-on' : 'radio-button-off'}
                                    size={24}
                                    color={referral === r ? colors.gold : '#888'}
                                />
                                <Text style={styles.optionText}>{r.charAt(0).toUpperCase() + r.slice(1)}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    {/* Botón enviar */}
                    <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                        <Text style={styles.submitText}>Completar Registro</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    flex: { flex: 1 },
    inner: {
        flexGrow: 1,
        justifyContent: 'flex-start',
        paddingBottom: 40,
    },
    container: {
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
    },
    title: {
        fontSize: 28,
        marginBottom: 30,
        textAlign: 'center',
        color: colors.textDark,
        fontWeight: 'bold',
    },
    errorText: {
        color: colors.errorRed,
        marginBottom: 10,
        textAlign: 'center',
    },
    label: {
        color: colors.textDark,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 5,
    },
    input: {
        height: 50,
        backgroundColor: colors.warmWhite,
        borderColor: colors.borderLight,
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 15,
        color: colors.textDark,
        marginBottom: 15,
    },
    disabled: {
        backgroundColor: '#eee',
    },
    inputContainer: {
        position: 'relative',
    },
    inputWithIcon: {
        paddingRight: 40,
    },
    iconRight: {
        position: 'absolute',
        right: 15,
        top: 13,
    },
    datePickerButton: {
        height: 50,
        backgroundColor: colors.warmWhite,
        borderColor: colors.borderLight,
        borderWidth: 1,
        borderRadius: 8,
        justifyContent: 'center',
        paddingHorizontal: 15,
        marginBottom: 15,
    },
    datePickerText: {
        color: colors.textDark,
        fontSize: 16,
    },
    genderOptions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 25,
    },
    genderOption: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        color: colors.textMuted,
        fontSize: 16,
        marginLeft: 5,
    },
    submitButton: {
        backgroundColor: colors.gold,
        paddingVertical: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: colors.textDark,
        shadowOpacity: 0.3,
        shadowOffset: { width: 0, height: 2 },
    },
    submitText: {
        color: colors.textDark,
        fontSize: 18,
        fontWeight: 'bold',
    },
});
