import Tflite from 'tflite-react-native';

class TensorFlowService {
  constructor() {
    this.tflite = new Tflite();
    this.modelLoaded = false;
  }

  loadModel = () => {
    return new Promise((resolve, reject) => {
      if (this.modelLoaded) {
        resolve(true);
        return;
      }

      this.tflite.loadModel(
        {
          model: 'models/best.tflite',
          labels: 'models/labels.txt',
          numThreads: 1,
        },
        (err, res) => {
          if (err) {
            console.log('❌ Failed to load TFLite model:', err);
            reject(err);
            return;
          }

          console.log('✅ TFLite model loaded:', res);
          this.modelLoaded = true;
          resolve(true);
        }
      );
    });
  };

  detectObjects = (imageUri) => {
    return new Promise((resolve, reject) => {
      if (!this.modelLoaded) {
        reject('Model not loaded');
        return;
      }

      this.tflite.detectObjectOnImage(
        {
          path: imageUri,
          threshold: 0.3,
          numResultsPerClass: 5,
        },
        (err, results) => {
          if (err) {
            console.log('❌ Detection error:', err);
            reject(err);
            return;
          }

          console.log('📦 Detection results:', results);
          resolve(results || []);
        }
      );
    });
  };

  close = () => {
    if (this.tflite) {
      this.tflite.close();
    }
    this.modelLoaded = false;
  };
}

export default new TensorFlowService();