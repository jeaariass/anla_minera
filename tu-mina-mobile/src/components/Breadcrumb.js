// src/components/Breadcrumb.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import COLORS from '../utils/colors';

const Breadcrumb = ({ items }) => {
  const navigation = useNavigation();

  return (
    <View style={styles.breadcrumbContainer}>
      <View style={styles.breadcrumbContent}>
        {items.map((item, index) => (
          <React.Fragment key={index}>
            {item.screen ? (
              <TouchableOpacity 
                onPress={() => navigation.navigate(item.screen)}
                style={styles.breadcrumbLinkContainer}
              >
                <Text style={styles.breadcrumbLink}>{item.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.breadcrumbCurrent}>{item.label}</Text>
            )}
            
            {index < items.length - 1 && (
              <Text style={styles.breadcrumbSeparator}>/</Text>
            )}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  breadcrumbContainer: {
    backgroundColor: '#f8f9fa',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  breadcrumbContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  breadcrumbLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breadcrumbArrow: {
    color: '#4a90e2',
    fontSize: 16,
    marginRight: 4,
    fontWeight: '600',
  },
  breadcrumbLink: {
    color: '#4a90e2',
    fontSize: 14,
    fontWeight: '500',
  },
  breadcrumbCurrent: {
    color: '#495057',
    fontSize: 14,
    fontWeight: '400',
  },
  breadcrumbSeparator: {
    color: '#adb5bd',
    fontSize: 14,
    marginHorizontal: 10,
    fontWeight: '300',
  },
});

export default Breadcrumb;