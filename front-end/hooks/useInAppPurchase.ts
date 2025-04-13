import { sendPurchaseToBackend } from '@/services/userService';
import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import Purchases, {
    CustomerInfo,
    PurchasesOffering,
    PurchasesPackage,
} from 'react-native-purchases';

const REVENUECAT_PUBLIC_API_KEY = 'goog_oIZTsprdqkzekMuxDuIgcXGHqczgoog_oIZTsprdqkzekMuxDuIgcXGHqcz';

export const useRevenueCat = (userId: string | null, token: string) => {
    const [offerings, setOfferings] = useState<PurchasesOffering | null>(null);
    const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
    const [isPro, setIsPro] = useState(false);

    useEffect(() => {
        if (!userId) return;

        const setupRevenueCat = async () => {
            try {
                // Configuramos RevenueCat con la API key y el appUserID
                Purchases.configure({ apiKey: REVENUECAT_PUBLIC_API_KEY, appUserID: userId });

                // Obtenemos los offerings y accedemos al offering con ID "Of_nexovecinal_premium"
                const offeringsResponse = await Purchases.getOfferings();
                const myOffering = offeringsResponse.all['Of_nexovecinal_premium'];
                if (myOffering) {
                    setOfferings(myOffering);
                } else {
                    console.warn('No se encontró el offering con ID "Of_nexovecinal_premium"');
                }

                // Obtenemos la información del cliente
                const info = await Purchases.getCustomerInfo();
                setCustomerInfo(info);
                setIsPro(!!info.entitlements.active.suscripcion_premium);
            } catch (error) {
                console.error('Error al configurar RevenueCat:', error);
                Alert.alert('Error', 'No se pudo cargar la información de suscripción.');
            }
        };

        setupRevenueCat();
    }, [userId]);

    const buySubscription = async (selectedPackage?: PurchasesPackage) => {
        // Si no se pasó un paquete, usamos el primer paquete disponible del offering obtenido
        if (!selectedPackage && offerings?.availablePackages.length) {
            selectedPackage = offerings.availablePackages[0];
        }

        if (!selectedPackage) {
            const res = await sendPurchaseToBackend("", token);
            console.log("premuu", res);

            Alert.alert('Error', 'No hay paquetes disponibles para comprar.');
            return;
        }

        try {
            const { customerInfo } = await Purchases.purchasePackage(selectedPackage);

            const isActive = !!customerInfo.entitlements.active.suscripcion_premium;

            setIsPro(isActive);
            setCustomerInfo(customerInfo);

            if (isActive) {
                Alert.alert('¡Gracias!', 'Tu suscripción ha sido activada.');
                Alert.alert('Detalles de la compra', `ID de usuario: ${userId}`);
                Alert.alert('Detalles de la compra', `ID de suscripción: ${customerInfo.entitlements.active.suscripcion_premium}`);
                await sendPurchaseToBackend("", token);
            } else {
                Alert.alert('Error', 'La suscripción no está activa.');
            }
        } catch (error: any) {
            if (!error.userCancelled) {
                console.error('Error en la compra:', error);
                Alert.alert('Error', 'No se pudo completar la compra.');
            }
        }
    };

    return {
        offerings,
        customerInfo,
        isPro,
        buySubscription,
    };
};
