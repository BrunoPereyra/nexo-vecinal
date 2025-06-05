import React from 'react';
import { Text } from 'react-native';

export default function AppText(props) {
    return (
        <Text {...props} style={[{ fontFamily: 'Poppins_400Regular' }, props.style]}>
            {props.children}
        </Text>
    );
}