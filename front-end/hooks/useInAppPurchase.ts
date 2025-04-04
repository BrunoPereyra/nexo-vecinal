import React, { useEffect } from 'react';
import {
    initConnection,
    endConnection,
    getProducts,
    requestPurchase,
    purchaseUpdatedListener,
    purchaseErrorListener,
    finishTransaction,
    ProductPurchase,
    PurchaseError,
    ErrorCode,
} from 'react-native-iap';
import { Alert } from 'react-native';
import { sendPurchaseToBackend } from '@/services/userService';

const ITEM_SKUS = ['tu_sku_de_suscripcion']; // Reemplaza con el ID exacto de tu suscripción en Play Console

export const useInAppPurchase = (token: string | null) => {
    useEffect(() => {
        if (!token) return;

        const initializeIAP = async () => {
            try {
                const result = await initConnection();
                console.log('Conexión inicializada:', result);

                const products = await getProducts({ skus: ITEM_SKUS });
                console.log('Productos cargados:', products);
            } catch (err) {
                console.error('Error al inicializar IAP:', err);
                if (err instanceof Error && err.message === ErrorCode.E_IAP_NOT_AVAILABLE) {
                    Alert.alert('Error', 'Las compras dentro de la aplicación no están disponibles en este dispositivo.');
                }
            }
        };

        initializeIAP();

        const purchaseUpdateSubscription = purchaseUpdatedListener(
            async (purchase: ProductPurchase) => {
                console.log('Compra actualizada:', purchase);
                const receipt = purchase.transactionReceipt;
                if (receipt) {
                    const res = await sendPurchaseToBackend(purchase, token);
                    if (res.success) {
                        Alert.alert('¡Gracias!', 'Suscripción confirmada.');
                    } else {
                        Alert.alert('Error', 'No se pudo validar la compra.');
                    }
                    await finishTransaction({ purchase });
                }
            }
        );

        const purchaseErrorSubscription = purchaseErrorListener(
            (error: PurchaseError) => {
                console.warn('Error en la compra:', error);
                if (error.code === ErrorCode.E_IAP_NOT_AVAILABLE) {
                    Alert.alert('Error', 'Las compras dentro de la aplicación no están disponibles en este dispositivo.');
                } else {
                    Alert.alert('Error', 'Hubo un problema con la compra.');
                }
            }
        );

        return () => {
            purchaseUpdateSubscription.remove();
            purchaseErrorSubscription.remove();
            endConnection();
        };
    }, [token]);

    const buySubscription = async () => {
        try {
            await requestPurchase({ sku: ITEM_SKUS[0] });
        } catch (err) {
            console.error('Error al iniciar la compra:', err);
            Alert.alert('Error', 'No se pudo iniciar la compra.');
        }
    };

    return { buySubscription };
};
