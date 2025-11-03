import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    backgroundColor: "#eaf8fc",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#0077b6",
  },
  image: {
    width: 250,
    height: 250,
    marginVertical: 15,
    borderRadius: 10,
  },
  resultBox: {
    marginTop: 25,
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 15,
    width: "90%",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 3,
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#023e8a",
  },
  classification: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    paddingVertical: 10,
    borderRadius: 10,
  },
  recyclable: {
    backgroundColor: "#a8dadc",
    color: "#1b4332",
  },
  nonRecyclable: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  detectedTitle: {
    fontWeight: "bold",
    marginTop: 10,
    color: "#0077b6",
  },
  detectedItem: {
    fontSize: 16,
    color: "#333",
    marginVertical: 2,
  },
});