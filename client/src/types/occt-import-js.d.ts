declare module 'occt-import-js' {
  interface OCCTResult {
    success: boolean;
    meshes: Array<{
      attributes: {
        position: {
          array: Float32Array;
        };
        normal?: {
          array: Float32Array;
        };
      };
      index: {
        array: Uint32Array;
      };
    }>;
    face_colors?: any[];
  }

  interface OCCTParams {
    linearUnit?: 'millimeter' | 'centimeter' | 'meter' | 'inch' | 'foot';
    linearDeflectionType?: 'boundingBoxDiagonal' | 'absoluteValue';
    linearDeflection?: number;
    angularDeflection?: number;
  }

  interface OCCT {
    ReadStepFile(buffer: Uint8Array, params: OCCTParams | null): OCCTResult;
    ReadIgesFile(buffer: Uint8Array, params: OCCTParams | null): OCCTResult;
    ReadBrepFile(buffer: Uint8Array, params: OCCTParams | null): OCCTResult;
  }

  function occtimportjs(): Promise<OCCT>;
  export default occtimportjs;
}